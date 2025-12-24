import { describe, test, expect } from 'vitest';
import { calcularDineroAEntregar } from '../src/controllers/rutaController.js';

describe('Cálculo Financiero de Rutas', () => {

    test('Caso 1: Cálculo básico correcto', async () => {
        // Given: Ruta con datos específicos
        const rutaData = {
            montoAsignado: 500,
            gastos: [
                { tipo: 'gasolina', monto: 120 },
                { tipo: 'peaje', monto: 25 },
                { tipo: 'almuerzo', monto: 15 }
            ],
            facturas: [
                { estado: 'entregada', pago: { montoPagado: 300, estado: 'pagada' } },
                { estado: 'entregada', pago: { montoPagado: 550, estado: 'pagada' } }
            ]
        };

        // When: Se calcula el dinero a entregar
        const resultado = calcularDineroAEntregar(rutaData);

        // Then: Debe ser = 500 + 850 - 160 = 1190
        expect(resultado.totalGastos).toBe(160);
        expect(resultado.totalCobrado).toBe(850);
        expect(resultado.dineroAEntregar).toBe(1190);
    });

    test('Caso 2: Gastos exceden cobros (déficit)', async () => {
        // Given: Más gastos que cobros
        const rutaData = {
            montoAsignado: 100,
            gastos: [{ tipo: 'gasolina', monto: 300 }],
            facturas: [{ estado: 'entregada', pago: { montoPagado: 50, estado: 'pagada' } }]
        };

        // When: Se calcula
        const resultado = calcularDineroAEntregar(rutaData);

        // Then: Debe ser déficit = 100 + 50 - 300 = -150
        expect(resultado.dineroAEntregar).toBe(-150);
        expect(resultado.esDeficit).toBe(true);
    });

    test('Caso 3: Sin gastos registrados', async () => {
        // Given: Ruta sin gastos
        const rutaData = {
            montoAsignado: 200,
            gastos: [],
            facturas: [{ estado: 'entregada', pago: { montoPagado: 100, estado: 'pagada' } }]
        };

        // When: Se calcula
        const resultado = calcularDineroAEntregar(rutaData);

        // Then: Debe ser = 200 + 100 - 0 = 300
        expect(resultado.totalGastos).toBe(0);
        expect(resultado.dineroAEntregar).toBe(300);
    });

    test('Caso 4: Facturas no pagadas no se cuentan', async () => {
        // Given: Facturas con diferentes estados de pago
        const rutaData = {
            montoAsignado: 100,
            gastos: [],
            facturas: [
                { estado: 'entregada', pago: { montoPagado: 50, estado: 'pagada' } },
                { estado: 'entregada', pago: { montoPendiente: 100 } }, // NO pagada
                { estado: 'no_entregada', pago: { montoPagado: 75 } }  // NO se cuenta
            ]
        };

        // When: Se calcula
        const resultado = calcularDineroAEntregar(rutaData);

        // Then: Solo debe contar la primera factura
        expect(resultado.facturasPagadas).toBe(1);
        expect(resultado.totalCobrado).toBe(50);
    });
});
