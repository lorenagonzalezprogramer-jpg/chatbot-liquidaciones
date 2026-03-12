import makeWASocket, { 
    DisconnectReason, 
    useMultiFileAuthState, 
    jidNormalizedUser,
    fetchLatestBaileysVersion
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import qrcode from 'qrcode-terminal';
import pino from 'pino';

export const whatsappService = {
    sock: null as any,

    async connect() {
        const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
        const { version } = await fetchLatestBaileysVersion();

        this.sock = makeWASocket({
            version,
            auth: state,
            logger: pino({ level: 'silent' }),
            browser: ["Motor Liquidaciones Col", "Chrome", "1.0.0"],
            printQRInTerminal: false,
            getMessage: async () => { return { conversation: 'bot' } } 
        });

        // IMPORTANTE: Guardar credenciales inmediatamente
        this.sock.ev.on('creds.update', saveCreds);

        this.sock.ev.on('connection.update', async (update: any) => {
            const { connection, lastDisconnect, qr } = update;
            
            if (qr) {
                console.log('📢 ESCANEA ESTE QR (EXPIRA PRONTO):');
                qrcode.generate(qr, { small: true });
            }

            if (connection === 'close') {
                const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
                // No reconectar si es Logout manual o si ya hay un error de stream
                const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
                
                console.log(`📡 Conexión cerrada. Estado: ${statusCode}. Reconectando: ${shouldReconnect}`);

                if (shouldReconnect) {
                    // Evitamos el bucle infinito con un pequeño delay
                    setTimeout(() => this.connect(), 5000);
                }
            } else if (connection === 'open') {
                console.log('✅ BOT CONECTADO EXITOSAMENTE A WHATSAPP');
            }
        });

        return this.sock;
    },

    async sendMessage(to: string, text: string) {
        try {
            if (!this.sock) throw new Error("Socket no inicializado");
            const id = jidNormalizedUser(to);
            await this.sock.sendMessage(id, { text });
        } catch (error) {
            console.error("❌ Error enviando mensaje:", error);
        }
    }
};