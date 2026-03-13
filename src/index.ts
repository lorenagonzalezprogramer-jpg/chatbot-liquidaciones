import 'dotenv/config';
import express, { Request, Response } from 'express';
import { whatsappService } from './services/whatsapp.service.js';
import { MESSAGES } from './config/messages.js'; 
import { liquidationAgent } from './agents/liquidation.agent.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req: Request, res: Response) => {
    res.send('Bot Liquidaciones Colombia 🚀 - 3S IA');
});

app.listen(PORT, () => console.log(`🌍 Servidor Express activo en puerto: ${PORT}`));

// ✅ Estado del chat con control de intentos
const chatState: Record<string, { step: string, cedula?: string, intentos?: number }> = {};

async function main() {
    const sock = await whatsappService.connect();

    sock.ev.on('messages.upsert', async ({ messages, type }: any) => {
        if (type !== 'notify') return;
        const msg = messages[0];
        
        if (!msg.message || msg.key.fromMe) return;

        const jid = msg.key.remoteJid!;
        const texto = (msg.message.conversation || msg.message.extendedTextMessage?.text || "").trim();
        
        try {
            if (!chatState[jid]) chatState[jid] = { step: 'INICIO', intentos: 0 };
            const estadoActual = chatState[jid];

            console.log(`📩 [${jid}] Recibido: "${texto}" | Paso Actual: ${estadoActual.step}`);

            // --- 1. ESTADO INICIAL / BIENVENIDA ---
            if (estadoActual.step === 'INICIO' || texto.toLowerCase() === 'hola' || texto.toLowerCase() === 'inicio') {
                if (texto === '1') {
                    await whatsappService.sendMessage(jid, MESSAGES.SOLICITAR_CEDULA);
                    estadoActual.step = 'ESPERANDO_CEDULA';
                } 
                else if (texto === '2') {
                    const menuSoporte = "🛠️ *Menú de Soporte Técnico*\n\n" +
                                       "¿En qué área necesitas ayuda hoy?\n\n" +
                                       "1️⃣ Problemas con el acceso (2FA/Cédula)\n" +
                                       "2️⃣ Error en los datos de mi liquidación\n" +
                                       "3️⃣ Hablar con un asesor\n\n" +
                                       "Escribe el número de tu opción.";
                    await whatsappService.sendMessage(jid, menuSoporte);
                    estadoActual.step = 'ESPERANDO_SOPORTE';
                } 
                else {
                    await whatsappService.sendMessage(jid, MESSAGES.BIENVENIDA);
                    estadoActual.step = 'INICIO';
                }
                estadoActual.intentos = 0; 
                return;
            }

            // --- 2. MANEJO DEL MENÚ DE SOPORTE ---
            if (estadoActual.step === 'ESPERANDO_SOPORTE') {
                let respuestaSoporte = "";
                const infoAdicional = "\n\n📩 Para más detalles, escríbenos a: *soporte@gmail.com*";
                const despedida = "\n\n" + MESSAGES.ESTADO_CIERRE;

                switch (texto) {
                    case '1':
                        respuestaSoporte = "🔐 *Problemas de Acceso:* Si el sistema no reconoce tu cédula, asegúrate de no usar puntos ni espacios." + infoAdicional + despedida;
                        break;
                    case '2':
                        respuestaSoporte = "📊 *Error en Datos:* Por favor adjunta un certificado bancario actualizado en un correo detallando tu caso." + infoAdicional + despedida;
                        break;
                    case '3':
                        respuestaSoporte = "👨‍💻 *Hablar con un asesor:* En breve un agente humano revisará tu chat." + infoAdicional + despedida;
                        break;
                    default:
                        await whatsappService.sendMessage(jid, "⚠️ Por favor, selecciona una opción válida (1, 2 o 3).");
                        return;
                }

                await whatsappService.sendMessage(jid, respuestaSoporte);
                estadoActual.step = 'FINALIZADO';
                await whatsappService.sendMessage(jid, MESSAGES.SOLICITAR_OTRA_ACCION);
                return;
            }

            // --- 3. CAPTURA DE CÉDULA ---
            if (estadoActual.step === 'ESPERANDO_CEDULA') {
                if (/^\d+$/.test(texto) && texto.length > 5) {
                    estadoActual.cedula = texto;
                    const respuesta = await liquidationAgent.consultarEstatus(texto, jid, sock);
                    if (respuesta) {
                        await whatsappService.sendMessage(jid, respuesta);
                    }
                    estadoActual.step = 'ESPERANDO_2FA';
                } else {
                    await whatsappService.sendMessage(jid, "⚠️ Por favor, ingresa un número de cédula válido.");
                }
                return;
            }

            // --- 4. VALIDACIÓN DE IDENTIDAD (2FA) Y MAPEO DE ESTADOS ---
            if (estadoActual.step === 'ESPERANDO_2FA') {
                const respuesta2FA = await liquidationAgent.consultarEstatus(estadoActual.cedula!, jid, sock, texto);
                
                if (respuesta2FA) {
                    if (respuesta2FA !== MESSAGES.FALLO_AUTENTICACION) {
                        estadoActual.intentos = 0;
                        let mensajeParaEnviar = "";

                        // --- MAPEO DE ESTADOS SEGÚN RESPUESTA DE LA BD ---
                        if (respuesta2FA.includes("PENDIENTE DOCUMENTACIÓN")) {
                            mensajeParaEnviar = MESSAGES.ESTADO_2_PENDIENTE_DOCS("- Cédula\n- Certificado Bancario");
                        } 
                        else if (respuesta2FA.includes("PAGO CONFIRMADO") || respuesta2FA.includes("PAGADO")) {
                            mensajeParaEnviar = MESSAGES.ESTADO_8_PAGADO("2026-03-25");
                        }
                        else if (respuesta2FA.includes("PROGRAMACIÓN DE PAGO")) {
                            mensajeParaEnviar = MESSAGES.ESTADO_7_PENDIENTE_PAGO;
                        }
                        else if (respuesta2FA.includes("REDACCIÓN CONTRATO")) {
                            mensajeParaEnviar = MESSAGES.ESTADO_5_CONTRATO_ELABORACION;
                        }
                        else if (respuesta2FA.includes("REVISIÓN ANALISTA")) {
                            mensajeParaEnviar = MESSAGES.ESTADO_REVISION_ANALISTA;
                        }
                        else if (respuesta2FA.includes("ELABORACIÓN LIQUIDACIÓN")) {
                            mensajeParaEnviar = MESSAGES.ESTADO_PENDIENTE_LIQUIDACION;
                        }
                        else if (respuesta2FA.includes("BORRADOR GENERADO")) {
                            mensajeParaEnviar = MESSAGES.ESTADO_4_APROBACION;
                        }
                        else if (respuesta2FA.includes("PENDIENTE FIRMA")) {
                            mensajeParaEnviar = MESSAGES.ESTADO_6_FIRMA_CONTRATO;
                        }
                        else if (respuesta2FA.includes("APROBACIÓN PENDIENTE")) {
                            mensajeParaEnviar = MESSAGES.ESTADO_APROBACION_SUPERVISOR;
                        }
                        else if (respuesta2FA.includes("DOCUMENTOS VALIDADOS")) {
                            mensajeParaEnviar = MESSAGES.ESTADO_3_DOCS_COMPLETOS;
                        }
                        else {
                            mensajeParaEnviar = respuesta2FA;
                        }

                        // --- LÓGICA DE FLUJO: ¿ES ESTADO FINAL O REQUIERE CONFIRMACIÓN? ---
                        if (respuesta2FA.includes("confirma si la información es correcta") || 
                            respuesta2FA.includes("Liquidación Lista para Pago")) {
                            
                            // Caso: Requiere confirmar cuenta (1 o 2). No cerramos el flujo aún.
                            await whatsappService.sendMessage(jid, mensajeParaEnviar);
                            estadoActual.step = 'ESPERANDO_CONFIRMACION_CUENTA';
                        } else {
                            // Caso: Estado informativo. Cerramos con despedida y menú inicial.
                            await whatsappService.sendMessage(jid, mensajeParaEnviar + "\n\n" + MESSAGES.ESTADO_CIERRE);
                            await whatsappService.sendMessage(jid, MESSAGES.SOLICITAR_OTRA_ACCION);
                            estadoActual.step = 'FINALIZADO';
                        }

                    } else {
                        // Manejo de intentos fallidos de 2FA
                        estadoActual.intentos = (estadoActual.intentos || 0) + 1;
                        if (estadoActual.intentos >= 3) {
                            await whatsappService.sendMessage(jid, MESSAGES.SOPORTE_HUMANO);
                            estadoActual.step = 'FINALIZADO';
                        } else {
                            const restantes = 3 - (estadoActual.intentos || 0);
                            await whatsappService.sendMessage(jid, `⚠️ ${respuesta2FA}\n\nIntentos restantes: *${restantes}*`);
                        }
                    }
                }
                return;
            }

            // --- 5. CONFIRMACIÓN DE CUENTA BANCARIA ---
            if (estadoActual.step === 'ESPERANDO_CONFIRMACION_CUENTA') {
                let mensajeCierre = "";
                
                if (texto === '1' || texto.toLowerCase() === 'si' || texto.toLowerCase() === 'sí') {
                    mensajeCierre = MESSAGES.ESTADO_CONFIRMACION_EXITOSA;
                } 
                else if (texto === '2' || texto.toLowerCase() === 'no') {
                    mensajeCierre = MESSAGES.ESTADO_SOLICITUD_CAMBIO_CUENTA;
                } else {
                    await whatsappService.sendMessage(jid, "⚠️ Por favor, selecciona una opción válida:\n1️⃣ Sí\n2️⃣ No");
                    return;
                }

                // Ejecutar actualización en BD
                await liquidationAgent.manejarConfirmacionCuenta(estadoActual.cedula!, texto);

                // Despedida final y opción de reinicio
                await whatsappService.sendMessage(jid, mensajeCierre + "\n\n" + MESSAGES.ESTADO_CIERRE);
                await whatsappService.sendMessage(jid, MESSAGES.SOLICITAR_OTRA_ACCION);
                
                estadoActual.step = 'FINALIZADO';
                return;
            }

            // --- 6. REINICIO TRAS FINALIZAR ---
            if (estadoActual.step === 'FINALIZADO' && texto.toLowerCase() === 'hola') {
                chatState[jid] = { step: 'INICIO', intentos: 0 };
                await whatsappService.sendMessage(jid, MESSAGES.BIENVENIDA);
                return;
            }

        } catch (error) {
            console.error(`❌ Error crítico:`, error);
            delete chatState[jid];
        }
    });
}

main().catch(console.error);