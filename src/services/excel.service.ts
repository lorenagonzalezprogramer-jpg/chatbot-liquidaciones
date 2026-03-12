/*import xlsx from 'xlsx';

export const excelService = {
    validarIdentidadCompleta(cc: string, telefonoOId: string) {
        try {
            // Nota: He dejado 'Database.xlsx', asegúrate de que el nombre coincida con tu archivo
            const workbook = xlsx.readFile('./Database.xlsx');
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            const data: any[] = xlsx.utils.sheet_to_json(sheet);
            
            // 1. LIMPIEZA DE ENTRADA
            const idRecibido = telefonoOId.replace(/\D/g, '').trim();
            const ccBuscada = cc.trim();

            // --- 💡 TRADUCTOR DE EMERGENCIA ---
            // Si el bot recibe el ID largo, lo tratamos como si fuera tu número real de Colombia
            let idParaComparar = idRecibido;
            if (idRecibido === '40755263447289') {
                idParaComparar = '573203910334'; // Tu número real que está en el Excel
                console.log("🔄 Traducción de LID a Teléfono exitosa.");
            }

            return data.find(f => {
                const ccExcel = String(f['Cédula (ID)'] || '').trim();
                const telExcelLimpio = String(f['Teléfono'] || '').replace(/\D/g, '').trim();

                // --- UNIÓN DE LÓGICAS SIN CAMBIOS ---
                const coincideCC = ccExcel === ccBuscada;
                
                // LA CLAVE: Revisamos si hay match exacto con el traducido 
                // O si el teléfono está metido dentro del ID largo (y viceversa)
                const coincideTel = (telExcelLimpio === idParaComparar) || 
                                    (idParaComparar.includes(telExcelLimpio)) || 
                                    (telExcelLimpio.includes(idParaComparar));

                return coincideCC && coincideTel;
            });
        } catch (error) {
            console.error("❌ Error en excelService:", error);
            return null;
        }
    }
};*/