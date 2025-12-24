import { describe, it, expect, vi, beforeEach } from 'vitest';
import { db } from '../src/config/firebase.js';

// Mock dependencies
vi.mock('../src/services/notificationService.js', () => ({
    sendEmail: vi.fn().mockResolvedValue(true),
    generateTrackingButtonHTML: vi.fn().mockReturnValue('<button>Track</button>'),
    generateBrandedEmailHTML: vi.fn().mockReturnValue('<html>Branded</html>'),
}));

vi.mock('../src/services/pdfService.js', () => ({
    generateInvoicePDF: vi.fn().mockResolvedValue(Buffer.from('pdf-content')),
}));

vi.mock('../src/services/whatsappService.js', () => ({
    default: {
        sendMessage: vi.fn().mockResolvedValue(true),
        sendMediaFile: vi.fn().mockResolvedValue(true),
        sendMediaUrl: vi.fn().mockResolvedValue(true),
    }
}));

vi.mock('../src/utils/ncfUtils.js', () => ({
    getNextNCF: vi.fn().mockResolvedValue('B0212345678'),
}));

// Import controller
import { createRecoleccion } from '../src/controllers/recoleccionesController.js';

describe('Recolecciones Controller - Unit Tests', () => {
    let req, res;

    beforeEach(() => {
        vi.clearAllMocks();

        req = {
            body: {
                remitenteNombre: 'Juan Perez',
                remitenteTelefono: '8095551234',
                remitenteEmail: 'juan@test.com',
                destinatarioNombre: 'Maria Lopez',
                destinatarioTelefono: '8295555678',
                destinatarioDireccion: 'Calle Falsa 123',
                items: JSON.stringify([{ descripcion: 'Paquete 1', cantidad: 1, precio: 100 }]),
                total: 100
            },
            userData: {
                uid: 'user-123',
                companyId: 'company-123',
                sucursalId: 'sucursal-1'
            }
        };

        res = {
            status: vi.fn().mockReturnThis(),
            json: vi.fn()
        };
    });

    it('debe crear una recolección correctamente con datos válidos', async () => {
        // Setup db mocks for this specific test
        // User doc check
        const userDocMock = { exists: true, data: () => ({ companyId: 'company-123' }) };
        vi.spyOn(db.collection('usuarios'), 'doc').mockReturnValue({
            get: vi.fn().mockResolvedValue(userDocMock)
        });

        // Config for runTransaction is already global, but let's verify it works
        const addMock = vi.fn().mockResolvedValue({ id: 'new-recoleccion-id' });

        // Fix: Spy on the collection() call to return an object that HAS the 'add' method
        // Because db.collection is already a spy in setup.js, we need to override its implementation behavior for this test
        const collectionSpy = vi.spyOn(db, 'collection');
        collectionSpy.mockImplementation((name) => {
            if (name === 'usuarios') {
                return {
                    doc: vi.fn().mockReturnValue({
                        get: vi.fn().mockResolvedValue(userDocMock)
                    })
                };
            }
            if (name === 'recolecciones') {
                return {
                    add: addMock
                };
            }
            // Fallback for companies lookup in transaction
            if (name === 'companies') {
                return {
                    doc: vi.fn().mockReturnThis()
                };
            }
            return {
                add: vi.fn(),
                doc: vi.fn()
            };
        });

        await createRecoleccion(req, res);

        // Assertions
        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            success: true,
            message: 'Recolección creada exitosamente'
        }));

        // Check if add was called with correct structure
        const addCall = addMock.mock.calls[0][0];
        expect(addCall).toHaveProperty('codigoTracking');
        expect(addCall).toHaveProperty('companyId', 'company-123');
        expect(addCall.items).toHaveLength(1);
        expect(addCall.remitente.nombre).toBe('Juan Perez');
    });

    it('debe fallar si faltan campos obligatorios', async () => {
        req.body.remitenteNombre = ''; // Missing field

        await createRecoleccion(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            success: false
        }));
    });

    it('debe manejar items enviados como array directo', async () => {
        req.body.items = [{ descripcion: 'Paquete Array', cantidad: 2, precio: 50 }];

        // Mock setup again
        const userDocMock = { exists: true, data: () => ({ companyId: 'company-123' }) };
        const addMock = vi.fn().mockResolvedValue({ id: 'id-array' });

        const collectionSpy = vi.spyOn(db, 'collection');
        collectionSpy.mockImplementation((name) => {
            if (name === 'usuarios') return { doc: vi.fn().mockReturnValue({ get: vi.fn().mockResolvedValue(userDocMock) }) };
            if (name === 'recolecciones') return { add: addMock };
            if (name === 'companies') return { doc: vi.fn().mockReturnThis() };
            return { add: vi.fn(), doc: vi.fn() };
        });

        await createRecoleccion(req, res);

        expect(res.status).toHaveBeenCalledWith(201);
        const addCall = addMock.mock.calls[0][0];
        expect(addCall.items[0].descripcion).toBe('Paquete Array');
    });
});
