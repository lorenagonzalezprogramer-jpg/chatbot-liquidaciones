import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';

dotenv.config();

// Instancia única de Prisma
const prisma = new PrismaClient();

export const prismaService = {
    client: prisma,

    /**
     * Función para validar por Cédula y Teléfono
     */
    async validarTrabajador(cedula: string, jid: string) {
        try {
            const telefonoRemitente = jid.split('@')[0].split(':')[0];
            
            // Se usa 'Trabajador' con T mayúscula según tu npx prisma generate
            const trabajador = await (prisma as any).Trabajador.findUnique({
                where: { cedula: cedula }
            });

            if (!trabajador) return { status: 'NO_EXISTE', datos: null };
            
            const telRegistrado = trabajador.telefono.replace(/\D/g, '').slice(-10);
            const telActual = telefonoRemitente.slice(-10);

            if (telRegistrado === telActual) {
                return { status: 'VALIDADO', datos: trabajador };
            } else {
                return { status: 'TELEFONO_ERROREO', datos: trabajador };
            }
        } catch (error) {
            console.error("❌ Error en validarTrabajador:", error);
            throw error;
        }
    },

    /**
     * Función para consultar todos los datos (incluyendo fecha_nacimiento)
     */
    async consultarTrabajador(cedula: string) {
        try {
            // Se usa 'Trabajador' con T mayúscula
            return await (prisma as any).Trabajador.findUnique({
                where: { cedula: cedula }
            });
        } catch (error) {
            console.error("❌ Error en consultarTrabajador:", error);
            return null;
        }
    },

    /**
     * Actualiza el estado del trabajador a 'PAGO CONFIRMADO' cuando el usuario presiona '1'
     */
    async marcarCuentaConfirmada(cedula: string) {
        try {
            // Usamos (this.client as any).Trabajador para mantener consistencia con las otras funciones
            return await (this.client as any).Trabajador.update({
                where: { cedula: cedula },
                data: { 
                    estatus_tramite: 'PAGO CONFIRMADO'
                }
            });
        } catch (error) {
            console.error("❌ Error al marcar cuenta confirmada en Prisma:", error);
            throw error;
        }
    }
};