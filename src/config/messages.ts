export const MESSAGES = {
    // --- ACCESO Y SEGURIDAD ---
    BIENVENIDA: "👋 ¡Hola! Te damos la bienvenida a tu *Asistente Virtual de Liquidaciones*.\n\n" +
                "Este espacio ha sido creado para que puedas consultar de forma autónoma, rápida y segura el avance de tu proceso de liquidación laboral, desde la revisión de documentos hasta la programación de tu pago. 📂✨\n\n" +
                "🛡️ *Seguridad:* Al continuar, nos autorizas el tratamiento de tus datos personales bajo nuestras políticas de privacidad.\n\n" +
                "¿En qué podemos apoyarte hoy?\n\n" +
                "1️⃣ *Consultar el estado de mi Liquidación*\n" +
                "2️⃣ *Soporte*",
    
    SOLICITAR_CEDULA: "✨ ¡Entendido! Con mucho gusto te ayudaré a revisar esa información.\n\n🔢 Por favor, *escríbeme tu número de cédula* (sin puntos ni comas) para buscarte en nuestro sistema de inmediato:",
    
    VALIDACION_2FA_MATCH: (nombre: string) => 
        `✨ ¡Qué gusto saludarte de nuevo, ${nombre}! \n\n` +
        `Para proteger tu información y asegurarnos de que solo tú puedas ver estos detalles, por favor confírmame tu *fecha de nacimiento*.\n\n` +
        `📅 Usa este formato: *AAAA-MM-DD* (Ejemplo: 1990-05-15):`,
    
    VALIDACION_2FA_NO_MATCH: "⚠️ Veo que nos escribes desde un número diferente al que tenemos registrado.\n\n" +
                             "🔒 No te preocupes, por tu seguridad y para validar tu identidad, por favor ingresa tu *Fecha de Nacimiento* en este formato: *AAAA-MM-DD* (Ejemplo: 1985-08-15):",

    // --- ESTADOS DE LIQUIDACIÓN ---
    ESTADO_1_NO_EXISTE: "😔 Lo sentimos, no logramos encontrar un proceso activo con esos datos. \n\nTe sugerimos contactar directamente al equipo de Gestión Humana al correo: *soporte@empresa.com* para revisar tu caso personalmente.",
    
    ESTADO_2_PENDIENTE_DOCS: (listaDocs: string) => `📂 *Estado actual: Documentación Pendiente*\n\nRevisamos tu carpeta y nos hace falta lo siguiente para avanzar:\n${listaDocs}\n\n📧 Por favor, envíalos lo antes posible al correo *soporte@gmail.com*. ¡Apenas los recibamos, seguiremos con tu trámite!`,
    
    ESTADO_REVISION_ANALISTA: "🔍 *Estado actual: En Revisión de Documentos*\n\n¡Buenas noticias! Ya recibimos tus soportes. Actualmente, nuestro equipo de analistas está verificando que cada documento cumpla con los requisitos legales para que no tengas problemas a futuro.",

    ESTADO_PENDIENTE_LIQUIDACION: "⏳ *Estado actual: Elaboración de Liquidación*\n\n¡Tu documentación fue aprobada con éxito! 🎉 Ahora el balón está en la cancha del equipo contable, quienes están calculando los valores oficiales de tu liquidación.",

    ESTADO_APROBACION_SUPERVISOR: "⚖️ *Estado actual: Verificación de Calidad*\n\nTu liquidación ya fue proyectada. En este momento, el despacho de supervisión está realizando el visto bueno final para asegurar que cada peso sea correcto antes de notificarte.",

    // --- CONFIRMACIÓN DE CUENTA BANCARIA ---
    ESTADO_LIQUIDACION_APROBADA: (fecha: string, cuenta: string) => 
        `✅ *Estado: ¡Liquidación Lista para Pago!*\n\nTu trámite ha sido aprobado. El pago está programado para el día *${fecha}* a tu cuenta bancaria terminada en *${cuenta}*.\n\nPor favor, confírmame si esta información es correcta:\n1️⃣ ✅ Sí, es correcta.\n2️⃣ ❌ No, mis datos bancarios cambiaron.`,

    ESTADO_CONFIRMACION_EXITOSA: "✅ ¡Excelente decisión! Tu información ha sido confirmada en el sistema.\n\nYa no tienes que hacer nada más. Por favor, mantente pendiente de tu banco. ¡Muchas gracias por tu paciencia! ✨",
    
    ESTADO_SOLICITUD_CAMBIO_CUENTA: "📝 Entiendo perfectamente. Hemos generado una alerta inmediata al equipo administrativo para que se pongan en contacto contigo y actualicen tus datos bancarios antes de realizar el giro.",

    // --- OTROS ESTADOS DEL PROCESO ---
    ESTADO_3_DOCS_COMPLETOS: "✅ *Estado: Documentos Validados*\n\n¡Todo en orden con tus papeles! Tu proceso ha pasado a la fase de liquidación financiera.",
    
    ESTADO_4_APROBACION: "⏳ *Estado: En proceso de Firma Interna*\n\n¡Hola! Te cuento que tus documentos ya pasaron la revisión técnica 📝.\n\nEstamos ajustando los últimos detalles legales. Tan pronto el borrador final esté listo, te lo haremos llegar a tu correo para tu tranquilidad.\n\n¡Estamos trabajando para que este proceso sea ágil para ti! ✨",
    
    ESTADO_5_CONTRATO_ELABORACION: "⏳ *Estado: Redactando tu Contrato Legal*\n\nEstamos preparando el documento formal (contrato de transacción) con los valores que ya fueron aprobados para tu firma.",
    
    ESTADO_6_FIRMA_CONTRATO: "🖋️ *Estado: Esperando tu Firma*\n\n¡Ya casi terminamos! Tu contrato oficial ya fue generado y enviado a tu correo electrónico 📄.\n\n**¿Qué debes hacer?**\n1. Revisa tu bandeja de entrada.\n2. Descarga, firma y reenvía el documento.\n\nUna vez lo recibamos firmado, daremos la orden de pago inmediata.",
    
    ESTADO_7_PENDIENTE_PAGO: "💰 *Estado: Programación de Pago*\n\n¡Contrato recibido! Hemos pasado tu orden a Tesorería. Tu pago ya está en la fila de desembolsos.",
    
    ESTADO_8_PAGADO: (fecha: string) => `🎉 *Estado: ¡Pago Realizado!*\n\n¡Felicidades! Tu proceso ha finalizado con éxito. El depósito se efectuó el día *${fecha}*. Esperamos que esta información te sea de mucha utilidad.`,

    // --- ERRORES Y EXCEPCIONES ---
    ARCHIVO_INVALIDO: "⚠️ *Problema con el archivo*\n\nNo pudimos leer el archivo que enviaste. ¿Podrías intentar enviarlo de nuevo en formato PDF o una foto (JPG/PNG) que sea bien clara? Gracias.",
    
    // ✅ Mensaje de agotamiento de intentos más amigable
    FALLO_AUTENTICACION: "🤔 No logramos validar esa información. Por favor, asegúrate de escribir la fecha exacta en el formato solicitado (Año-Mes-Día), por ejemplo: *1990-05-15*.",
    
    // ✅ Nuevo mensaje de redirección empático (Sin "Soporte Humano")
    SOPORTE_HUMANO: "✨ ¡No te preocupes! A veces los sistemas pueden ser un poco estrictos. \n\nPara ayudarte de forma personalizada y revisar qué está sucediendo, por favor escríbenos a: *soporte@gmail.com*. \n\n¡Allí estaremos muy pendientes de tu caso!",
    
    CERTIFICADO_GENERADO: "📄 Aquí tienes tu resumen oficial de consulta. Contiene todos los detalles de tu trámite hasta el día de hoy.",

    // --- CIERRE Y SEGUIMIENTO ---
    ESTADO_CIERRE: "\n\n✨ *¡Fue un gusto apoyarte hoy!* \nEspero que esta información te brinde mucha tranquilidad. Si tienes más dudas, aquí estaré para cuando lo necesites. \n\n¡Que tengas un resto de día maravilloso! 👋",
    
    SOLICITAR_OTRA_ACCION: "¿Hay algo más en lo que pueda ayudarte ahora? Si es así, solo escribe *Hola* para volver al menú.",

    error: "🤯 ¡Ups! Algo no salió bien en mis sistemas. Por favor, dame unos minutos e inténtalo de nuevo." 
};