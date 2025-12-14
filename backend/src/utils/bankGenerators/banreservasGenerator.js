/**
 * Genera el contenido del archivo TXT para nómina de Banreservas.
 * Formato estándar (Placeholder/Template - Ajustar según manual oficial)
 * 
 * @param {Array} payments - Lista de pagos [{ nombre, cedula, cuenta, monto }]
 * @param {String} companyName - Nombre de la empresa
 * @param {Date} date - Fecha de pago
 */
export const generateBanreservasFile = (payments, companyName, date = new Date()) => {
    const lineas = [];

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const fechaStr = `${year}${month}${day}`;

    // 1. HEADER
    // Banreservas suele requerir número de cuenta de la empresa en el header
    lineas.push(`HEADER|${companyName}|${fechaStr}`);

    let totalMonto = 0;

    // 2. DETALLES
    payments.forEach(p => {
        const nombre = p.nombre.toUpperCase().slice(0, 40);
        const cuenta = p.cuenta.replace(/[^0-9]/g, '');
        const cedula = p.cedula ? p.cedula.replace(/[^0-9]/g, '') : '';
        const monto = p.monto.toFixed(2); // Banreservas a veces usa formato con punto

        totalMonto += p.monto;

        // Formato Genérico Banreservas:
        // CtaDestino,Monto,Nombre,Cedula,Concepto
        lineas.push(`${cuenta},${monto},${nombre},${cedula},NOMINA`);
    });

    return lineas.join('\r\n');
};
