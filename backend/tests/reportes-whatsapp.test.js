import { describe, test, expect, vi, beforeEach } from 'vitest';
import { finalizarRuta } from '../src/controllers/rutaController.js';
import { db } from '../src/config/firebase.js';

// Mock dependencies
const sendFinancialReportMock = vi.fn().mockResolvedValue(true);
const sendMessageMock = vi.fn().mockResolvedValue(true);

vi.mock('../src/services/whatsappNotificationService.js', () => ({
    default: {
        sendFinancialReportOnRouteClose: sendFinancialReportMock,
        sendMessage: sendMessageMock
    }
}));

// Mock getUserDataSafe helper which is used in controller
// We need to ensure we can control what it returns or mock the db user lookup involved
vi.mock('../src/utils/userUtils.js', () => ({
    getUserDataSafe: vi.fn().mockResolvedValue({ companyId: 'company456' })
}));


describe('Reportes Financieros WhatsApp', () => {
    let req, res;

    beforeEach(() => {
        vi.clearAllMocks();
        req = {
            params: { id: 'ruta-123' },
            body: {},
            user: { uid: 'admin-uid' },
            userData: { uid: 'admin-uid', companyId: 'company456' }
        };
        res = {
            json: vi.fn(),
            status: vi.fn().mockReturnThis()
        };
    });

    test('Debe enviar reporte al repartidor Y admin_general', async () => {
        // Given: Ruta completada mock data
        const rutaData = {
            nombre: 'Ruta Test',
            repartidorId: 'rep123',
            companyId: 'company456',
            montoAsignado: 500,
            gastos: [{ monto: 150 }],
            facturas: [
                { id: 'f1', estado: 'entregada', facturaId: 'f1' },
                { id: 'f2', estado: 'entregada', facturaId: 'f2' }
            ]
        };

        // Setup DB Mocks
        // 1. Ruta doc
        const rutaDoc = { exists: true, data: () => rutaData };

        // 2. Factura doc (for payment check in loop)
        const facturaDoc = {
            exists: true,
            data: () => ({ pago: { estado: 'pagada', montoPagado: 400 } })
        };

        // 3. Admin General User Query
        const adminDoc = { id: 'admin-gen-id', data: () => ({ rol: 'admin_general' }) };

        const batchMock = {
            update: vi.fn(),
            commit: vi.fn().mockResolvedValue(true)
        };

        // Complex DB Mock logic
        const collectionSpy = vi.spyOn(db, 'collection');
        collectionSpy.mockImplementation((col) => {
            if (col === 'rutas') {
                return {
                    doc: vi.fn().mockReturnValue({
                        get: vi.fn().mockResolvedValue(rutaDoc),
                        update: vi.fn() // for fallback if batch not used? controller uses batch
                    })
                };
            }
            if (col === 'recolecciones') {
                return {
                    doc: vi.fn().mockReturnValue({
                        get: vi.fn().mockResolvedValue(facturaDoc)
                    })
                };
            }
            if (col === 'usuarios') {
                return {
                    where: vi.fn().mockReturnThis(),
                    limit: vi.fn().mockReturnThis(),
                    get: vi.fn().mockResolvedValue({
                        empty: false,
                        docs: [adminDoc]
                    }),
                    doc: vi.fn().mockReturnThis() // for individual user lookup if needed
                };
            }
            return { doc: vi.fn() };
        });

        vi.spyOn(db, 'batch').mockReturnValue(batchMock);

        // When: Se finaliza la ruta
        await finalizarRuta(req, res);

        // Then: Debe enviar 2 mensajes (repartidor + admin_general)
        // Controller implementation calls `sendFinancialReportOnRouteClose`

        expect(sendFinancialReportMock).toHaveBeenCalledTimes(2);

        // Verificar datos del reporte
        // Call 1: Repartidor
        const call1 = sendFinancialReportMock.mock.calls[0];
        expect(call1[0]).toBe('company456'); // companyId
        expect(call1[1]).toBe('rep123');     // userId

        // Logic Verification:
        // Monto Asignado: 500
        // Total Cobrado: 400 (f1) + 400 (f2) = 800
        // Total Gastos: 150
        // Dinero a Entregar = 500 + 800 - 150 = 1150

        expect(call1[2].dineroAEntregar).toBe(1150);

        // Call 2: Admin General
        const call2 = sendFinancialReportMock.mock.calls[1];
        expect(call2[1]).toBe('admin-gen-id');
        expect(call2[2].dineroAEntregar).toBe(1150);

        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });
});
