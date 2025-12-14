/**
 * Genera el contenido del archivo TXT para nómina del Banco Popular.
 * Formato estándar (Placeholder/Template - Ajustar según manual oficial)
 * 
 * @param {Array} payments - Lista de pagos [{ nombre, cedula, cuenta, monto }]
 * @param {String} companyName - Nombre de la empresa
 * @param {Date} date - Fecha de pago
 */
export const generatePopularFile = (payments, companyName, date = new Date()) => {
    const lineas = [];

    // Formatear fecha YYYYMMDD
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const fechaStr = `${year}${month}${day}`;

    // 1. HEADER
    // Popular suele usar un header diferente, por ejemplo:
    // H|RNC_EMPRESA|FECHA|SEC
    lineas.push(`H|${companyName.toUpperCase()}|${fechaStr}|01`);

    let totalMonto = 0;

    // 2. DETALLES
    payments.forEach(p => {
        const nombre = p.nombre.toUpperCase().slice(0, 30);
        const cuenta = p.cuenta.replace(/[^0-9]/g, '');
        const cedula = p.cedula ? p.cedula.replace(/[^0-9]/g, '') : '';
        const montoEntero = Math.round(p.monto * 100);
        const montoStr = String(montoEntero).padStart(12, '0'); // Popular a veces usa 12 dígitos

        totalMonto += p.monto;

        // Formato Popular (Ejemplo):
        // D|CUENTA_DESTINO|MONTO|CEDULA|NOMBRE
        lineas.push(`D|${cuenta}|${montoStr}|${cedula}|${nombre}`);
    });

    // 3. TRAILER
    const totalEntero = Math.round(totalMonto * 100);
    const totalStr = String(totalEntero).padStart(12, '0');
    const cantidad = String(payments.length).padStart(6, '0');

    lineas.push(`T|${cantidad}|${totalStr}`);

    return lineas.join('\r\n');
};
