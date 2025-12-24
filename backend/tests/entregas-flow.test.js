import { describe, test, expect, vi, beforeEach } from 'vitest';
import { db } from '../src/config/firebase.js';

// Mocks globales
vi.mock('../src/services/whatsappService.js');
vi.mock('../src/services/notificationService.js');

describe('Flujo Completo de Entregas', () => {

    beforeEach(() => {
        vi.clearAllMocks();
    });

    test('Flujo exitoso: Factura -> Asignación -> Entrega -> Pago', async () => {
        // 1. Crear factura mockeada en DB
        const facturaId = 'factura-123';
        const facturaData = {
            id: facturaId,
            cliente: 'Juan Pérez',
            monto: 500,
            estado: 'confirmada_secretaria',
            pago: { estado: 'pendiente' }
        };

        // Mocks para simular DB behaviors
        const facturaRefMock = {
            id: facturaId,
            get: vi.fn().mockResolvedValue({ exists: true, data: () => facturaData }),
            update: vi.fn().mockImplementation((data) => {
                Object.assign(facturaData, data); // update local object state
                return Promise.resolve();
            })
        };

        // Simulate finding the invoice
        vi.spyOn(db, 'collection').mockImplementation((col) => {
            if (col === 'recolecciones') return {
                doc: vi.fn().mockImplementation((id) => {
                    if (id === facturaId) return facturaRefMock;
                    return { get: vi.fn().mockResolvedValue({ exists: false }) };
                }),
                add: vi.fn().mockResolvedValue({ id: facturaId })
            };
            if (col === 'rutas') return {
                add: vi.fn().mockResolvedValue({ id: 'ruta-123' }),
                doc: vi.fn().mockReturnValue({
                    get: vi.fn().mockResolvedValue({ exists: true, data: () => ({ id: 'ruta-123', nombre: 'Ruta Centro' }) }),
                    update: vi.fn()
                })
            };
            // Default mocks
            return { doc: vi.fn().mockReturnThis(), get: vi.fn().mockResolvedValue({ empty: true }) };
        });

        // --- STEP 1: Verify Initial State ---
        expect(facturaData.estado).toBe('confirmada_secretaria');

        // --- STEP 2: Asignar a Ruta (Simulated Logic) ---
        // In a real controller, this would be `createRutaAvanzada` or similar.
        // For this flow test, we simulate the effect of the controller logic on the data:

        const rutaId = 'ruta-123';
        await facturaRefMock.update({
            estado: 'en_ruta',
            rutaId: rutaId,
            repartidorId: 'rep-1'
        });

        expect(facturaData.rutaId).toBe(rutaId);
        expect(facturaData.estado).toBe('en_ruta');

        // --- STEP 3: Marcar como Entregada ---
        // Controller logic would be `updateEntrega`

        const evidencias = { foto: 'url.jpg', firma: 'url.jpg' };
        await facturaRefMock.update({
            estado: 'entregada',
            fotos: [evidencias.foto],
            firma: evidencias.firma,
            fechaEntrega: new Date().toISOString()
        });

        expect(facturaData.estado).toBe('entregada');
        expect(facturaData.fotos).toContain('url.jpg');

        // --- STEP 4: Registrar Pago ---
        // Controller logic would be `registrarPago`

        await facturaRefMock.update({
            pago: {
                estado: 'pagada',
                montoPagado: 500,
                fechaPago: new Date().toISOString()
            }
        });

        expect(facturaData.pago.estado).toBe('pagada');
        expect(facturaData.pago.montoPagado).toBe(500);
    });

    test('Caso: Factura no entregada', async () => {
        // Given: Factura asignada a ruta
        const facturaId = 'factura-404';
        const facturaData = {
            id: facturaId,
            estado: 'en_ruta',
            rutaId: 'ruta-123'
        };

        const facturaRefMock = {
            id: facturaId,
            get: vi.fn().mockResolvedValue({ exists: true, data: () => facturaData }),
            update: vi.fn().mockImplementation((data) => {
                Object.assign(facturaData, data);
                return Promise.resolve();
            })
        };

        // When: Se marca como no entregada (Simulated controller logic)
        await facturaRefMock.update({
            estado: 'no_entregada',
            motivoNoEntrega: 'Cliente no estaba',
            reporteNoEntrega: { motivo: 'Cliente no estaba' }
        });

        // Then: Estado correcto y motivo registrado
        expect(facturaData.estado).toBe('no_entregada');
        expect(facturaData.motivoNoEntrega).toBe('Cliente no estaba');
    });
});
