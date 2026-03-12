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

            console.log(`📩 [${jid}] Recibido: "${texto}" | Paso Actual: ${estadoActual.step} | Intentos: ${estadoActual.intentos}`);

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
                await whatsappService.sendMessage(jid, "¿Deseas realizar otra acción? Escribe *Hola* para volver al menú principal.");
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

            // --- 4. VALIDACIÓN DE IDENTIDAD (2FA) CON LÍMITE DE INTENTOS Y DOCS FALTANTES ---
            if (estadoActual.step === 'ESPERANDO_2FA') {
                const respuesta2FA = await liquidationAgent.consultarEstatus(estadoActual.cedula!, jid, sock, texto);
                
                if (respuesta2FA) {
                    if (respuesta2FA !== MESSAGES.FALLO_AUTENTICACION) {
                        // ✅ ÉXITO DE AUTENTICACIÓN
                        estadoActual.intentos = 0;

                        // 💡 LÓGICA PARA DOCUMENTOS FALTANTES
                        if (respuesta2FA.includes("PENDIENTE DOCUMENTACIÓN")) {
                            // Definimos los documentos que faltan (esto podría venir de tu BD más adelante)
                            const docsFaltantes = "- Cédula de Ciudadanía\n- Certificado Bancario"; 
                            await whatsappService.sendMessage(jid, MESSAGES.ESTADO_2_PENDIENTE_DOCS(docsFaltantes) + "\n\n" + MESSAGES.ESTADO_CIERRE);
                        } else {
                            // Respuesta estándar para otros estados
                            await whatsappService.sendMessage(jid, respuesta2FA + "\n\n" + MESSAGES.ESTADO_CIERRE);
                        }

                        // Manejo de flujos posteriores
                        if (respuesta2FA.includes("confirma si la información es correcta")) {
                            estadoActual.step = 'ESPERANDO_CONFIRMACION_CUENTA';
                        } else {
                            estadoActual.step = 'FINALIZADO';
                            await whatsappService.sendMessage(jid, MESSAGES.SOLICITAR_OTRA_ACCION);
                        }

                    } else {
                        // ❌ FALLO DE AUTENTICACIÓN: Incrementamos contador
                        estadoActual.intentos = (estadoActual.intentos || 0) + 1;
                        
                        if (estadoActual.intentos >= 3) {
                            // 🚩 Límite alcanzado: Mensaje empático y derivación
                            await whatsappService.sendMessage(jid, "⚠️ Has agotado los 3 intentos permitidos.");
                            await whatsappService.sendMessage(jid, MESSAGES.SOPORTE_HUMANO); 
                            await whatsappService.sendMessage(jid, "Escribe *Hola* cuando desees intentar de nuevo.");
                            estadoActual.step = 'FINALIZADO';
                        } else {
                            // 🧡 Quedan intentos: Mostrar aviso
                            const intentosRestantes = 3 - estadoActual.intentos;
                            const avisoIntentos = `\n\nTe quedan *${intentosRestantes}* ${intentosRestantes === 1 ? 'intento' : 'intentos'}.`;
                            
                            await whatsappService.sendMessage(jid, "⚠️ " + respuesta2FA + avisoIntentos);
                        }
                    }
                }
                return;
            }

            // --- 5. CONFIRMACIÓN DE CUENTA BANCARIA ---
            if (estadoActual.step === 'ESPERANDO_CONFIRMACION_CUENTA') {
                const respuestaConfirmacion = await liquidationAgent.manejarConfirmacionCuenta(estadoActual.cedula!, texto);
                await whatsappService.sendMessage(jid, respuestaConfirmacion);

                if (/^(1|2|si|no|sí)$/i.test(texto)) {
                    estadoActual.step = 'FINALIZADO';
                    await whatsappService.sendMessage(jid, MESSAGES.SOLICITAR_OTRA_ACCION);
                }
                return;
            }

            // --- 6. REINICIO TRAS FINALIZAR ---
            if (estadoActual.step === 'FINALIZADO') {
                if (texto.toLowerCase() === 'hola') {
                    chatState[jid] = { step: 'INICIO', intentos: 0 };
                    await whatsappService.sendMessage(jid, MESSAGES.BIENVENIDA);
                }
                return;
            }

        } catch (error) {
            console.error(`❌ Error crítico:`, error);
            await whatsappService.sendMessage(jid, "⚠️ Hubo un inconveniente técnico. Escribe *Hola* para reiniciar.");
            delete chatState[jid];
        }
    });
}

main().catch(console.error);