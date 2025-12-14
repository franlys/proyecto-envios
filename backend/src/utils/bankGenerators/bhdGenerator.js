// backend/src/utils/bankGenerators/bhdGenerator.js

/**
 * Genera el contenido del archivo TXT para nómina del Banco BHD.
 * Formato genérico basado en estándares bancarios (Header + Detalles + Trailer)
 * 
 * @param {Array} payments - Lista de pagos [{ nombre, cedula, cuenta, monto }]
 * @param {String} companyName - Nombre de la empresa
 * @param {Date} date - Fecha de pago
 */
export const generateBHDFile = (payments, companyName, date = new Date()) => {
    const lineas = [];

    // Formatear fecha YYYYMMDD
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const fechaStr = `${year}${month}${day}`;

    // 1. HEADER (Cabecera)
    // Formato: H|NOMBRE_EMPRESA|FECHA
    lineas.push(`H|${companyName.toUpperCase()}|${fechaStr}`);

    let totalMonto = 0;

    // 2. DETALLES (Empleados)
    payments.forEach(p => {
        // Limpiar datos
        const nombre = p.nombre.toUpperCase().slice(0, 30); // Max 30 chars
        const cuenta = p.cuenta.replace(/[^0-9]/g, ''); // Solo números
        const cedula = p.cedula ? p.cedula.replace(/[^0-9]/g, '') : '';

        // Formatear monto: 1234.56 -> 0000123456 (10 dígitos, sin punto)
        const montoEntero = Math.round(p.monto * 100);
        const montoStr = String(montoEntero).padStart(10, '0');

        totalMonto += p.monto;

        // Formato: D|NOMBRE|CEDULA|CUENTA|MONTO
        lineas.push(`D|${nombre}|${cedula}|${cuenta}|${montoStr}`);
    });

    // 3. TRAILER (Pie de página)
    // Formato: T|CANTIDAD_REGISTROS|MONTO_TOTAL
    const totalEntero = Math.round(totalMonto * 100);
    const totalStr = String(totalEntero).padStart(10, '0');
    const cantidad = payments.length;

    lineas.push(`T|${cantidad}|${totalStr}`);

    // Unir con saltos de línea
    return lineas.join('\r\n');
};
