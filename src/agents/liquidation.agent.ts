import { prismaService } from '../services/prisma.service.js';
import { MESSAGES } from '../config/messages.js';
import * as fs from 'fs'; 

export const liquidationAgent = {
    /**
     * Procesa la consulta de estatus integrando seguridad 2FA y lógica de estados
     */
    async consultarEstatus(cedula: string, jid: string, sock: any, pasoSeguridad?: string) {
        try {
            // 1. Obtener datos del trabajador desde Prisma
            const trabajador = await prismaService.consultarTrabajador(cedula);

            // --- ESTADO 1: NO EXISTE ---
            if (!trabajador) {
                return MESSAGES.ESTADO_1_NO_EXISTE;
            }

            // 2. VALIDACIÓN DE SEGURIDAD (Muro de Seguridad Inicial)
            const telefonoRemitente = jid.split('@')[0].split(':')[0];
            const telRegistrado = trabajador.telefono.replace(/\D/g, '').slice(-10);
            const telActual = telefonoRemitente.slice(-10);

            if (!pasoSeguridad) {
                if (telRegistrado === telActual) {
                    return MESSAGES.VALIDACION_2FA_MATCH(trabajador.nombre);
                } else {
                    return MESSAGES.VALIDACION_2FA_NO_MATCH;
                }
            }

            // 3. VERIFICACIÓN DEL SEGUNDO FACTOR (2FA - Fecha de Nacimiento Completa)
            const esValido = await this.verificarDatosSensibles(trabajador, pasoSeguridad);
            
            if (!esValido) {
                console.log(`❌ Acceso denegado para cédula: ${cedula}`);
                return MESSAGES.FALLO_AUTENTICACION;
            }

            console.log(`✅ Acceso concedido. Procesando estatus_tramite: ${trabajador.estatus_tramite}`);

            // 4. LÓGICA DE LOS ESTADOS
            let respuestaChat: string | null = null;
            const estatus = trabajador.estatus_tramite.toUpperCase();

            switch (estatus) {
                case 'PENDIENTE DOCUMENTACIÓN': 
                    respuestaChat = MESSAGES.ESTADO_2_PENDIENTE_DOCS(this.obtenerListaFaltantes(trabajador));
                    break;

                case 'EN REVISIÓN DE DOCUMENTACIÓN':
                case 'SOPORTES EN EVALUACIÓN':
                case 'REVISIÓN ANALISTA':
                    respuestaChat = MESSAGES.ESTADO_REVISION_ANALISTA;
                    break;

                case 'PENDIENTE DE LIQUIDACIÓN':
                case 'ESPERA CONTABLE':
                case 'PENDIENTE CALCULO':
                    respuestaChat = MESSAGES.ESTADO_PENDIENTE_LIQUIDACION;
                    break;

                case 'APROBACIÓN PENDIENTE':
                case 'REVISIÓN SUPERVISOR':
                    respuestaChat = MESSAGES.ESTADO_APROBACION_SUPERVISOR;
                    break;

                // --- NUEVO ESTADO: CONFIRMACIÓN DE CUENTA BANCARIA ---
                case 'LIQUIDACION APROBADA':
                case 'CONFIRMACION PAGO':
                    // Verifica si el campo existe en el objeto 'trabajador' que devuelve Prisma
                    const fechaBruta = trabajador.fecha_programada_pago || trabajador.fecha_pago;
                    
                    const fechaPago = fechaBruta 
                        ? new Date(fechaBruta).toLocaleDateString('es-CO') 
                        : 'Próxima fecha disponible';
                        
                    // Asegúrate de que numero_cuenta sea el nombre exacto en la DB
                    const cuentaCompleta = trabajador.numero_cuenta || trabajador.cuenta_bancaria || '';
                    const numCuenta = cuentaCompleta.length > 4 
                        ? cuentaCompleta.slice(-4) 
                        : 'XXXX';

                    respuestaChat = MESSAGES.ESTADO_LIQUIDACION_APROBADA(fechaPago, numCuenta);
                    break;

                case 'DOCUMENTACIÓN VALIDADA': 
                case 'LIQUIDACIÓN GENERADA':
                    respuestaChat = MESSAGES.ESTADO_3_DOCS_COMPLETOS;
                    break;

                case 'BORRADOR GENERADO':
                case 'APROBADO': 
                    respuestaChat = MESSAGES.ESTADO_4_APROBACION;
                    break;

                case 'CONTRATO EN ELABORACIÓN':
                case 'EN PROCESO': 
                    respuestaChat = MESSAGES.ESTADO_5_CONTRATO_ELABORACION;
                    break;

                case 'PENDIENTE FIRMA':
                case 'EN PROCESO - VALIDACIÓN DE IDENTIDAD': 
                    // Se envía texto + cierre y se sale con return null para no repetir al final
                    await sock.sendMessage(jid, { text: MESSAGES.ESTADO_6_FIRMA_CONTRATO + MESSAGES.ESTADO_CIERRE });

                    const rutaPDF = trabajador.ruta_pdf_contrato;
                    if (rutaPDF && fs.existsSync(rutaPDF)) {
                        await sock.sendMessage(jid, {
                            document: { url: rutaPDF },
                            fileName: 'Contrato_Liquidacion.pdf',
                            mimetype: 'application/pdf',
                            caption: '📄 Aquí tienes tu contrato para firmar.'
                        });
                    }
                    return null; 

                case 'EN REVISIÓN': 
                case 'PENDIENTE PAGO':
                    respuestaChat = MESSAGES.ESTADO_7_PENDIENTE_PAGO;
                    break;

                case 'LIQUIDADO': 
                case 'PAGADO':
                    const fecha = trabajador.fecha_pago ? new Date(trabajador.fecha_pago).toLocaleDateString() : 'Recientemente';
                    respuestaChat = MESSAGES.ESTADO_8_PAGADO(fecha);
                    break;

                default:
                    respuestaChat = `Tu trámite se encuentra en: *${trabajador.estatus_tramite}*.`;
            }

            // RETORNO LIMPIO: Ya no concatenamos el cierre aquí para evitar duplicados en index.ts
            return respuestaChat; 

        } catch (error) {
            console.error("❌ Error en liquidationAgent:", error);
            return MESSAGES.error;
        }
    },

    /**
     * Maneja la respuesta del usuario (1 o 2) cuando está en el paso de confirmar cuenta
     */
    async manejarConfirmacionCuenta(cedula: string, mensajeUsuario: string) {
        const respuesta = mensajeUsuario.trim();

        if (respuesta === '1') {
            // --- OPCIÓN: CORRECTO ---
            await prismaService.marcarCuentaConfirmada(cedula);
            
            return MESSAGES.ESTADO_CONFIRMACION_EXITOSA + MESSAGES.ESTADO_CIERRE;
            
        } else if (respuesta === '2') {
            // --- OPCIÓN: INCORRECTO ---
            return MESSAGES.ESTADO_SOLICITUD_CAMBIO_CUENTA + MESSAGES.ESTADO_CIERRE;
            
        } else {
            // Respuesta no válida
            return "⚠️ Por favor, marca *1* si es correcto o *2* si deseas actualizarla.";
        }
    },

    /**
     * Sincronizado con las columnas de la tabla 'trabajadores'
     */
    obtenerListaFaltantes(u: any) {
        const docs = [
            { n: 'Contrato/Certificación', v: u.contrato_certificacion },
            { n: 'Cédula de ciudadanía', v: u.cedula_doc },
            { n: 'Planillas seguridad social', v: u.planillas_seg_soc },
            { n: 'Certificación bancaria', v: u.cert_bancaria },
            { n: 'Autorización de pago', v: u.autorizacion_pago }
        ];
        return docs
            .filter(d => {
                const val = String(d.v).toUpperCase();
                return val === 'NO' || val === 'PENDIENTE' || val === 'NO RECIBIDO';
            })
            .map(d => `• ${d.n}`)
            .join('\n');
    },

    /**
     * Valida la fecha de nacimiento completa (AAAA-MM-DD)
     */
    async verificarDatosSensibles(trabajador: any, entrada: string) {
        if (!trabajador.fecha_nacimiento) return false;

        // Convertimos la fecha de la DB (Date object) a string ISO "YYYY-MM-DD"
        const fechaDB = new Date(trabajador.fecha_nacimiento).toISOString().split('T')[0];
        
        // Limpiamos la entrada del usuario por si pone espacios extra
        const fechaUsuario = entrada.trim();

        console.log(`🔍 Comparando Entrada: [${fechaUsuario}] vs DB: [${fechaDB}]`);

        return fechaUsuario === fechaDB;
    }
};