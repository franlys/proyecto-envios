import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import { db } from '../src/config/firebase.js';
import app from '../src/index.js';

vi.mock('../src/utils/trackingUtils.js', () => ({
    validarFormatoTracking: vi.fn().mockReturnValue(true),
}));

describe('Public Tracking API - Integration Tests', () => {

    it('GET /api/tracking/public/:codigo debe devolver información de tracking', async () => {
        const mockCodigo = 'EMI-RC-0001';

        // Mock database finding the record
        const mockRecoleccionData = {
            codigoTracking: mockCodigo,
            companyId: 'company-123',
            estadoGeneral: 'en_route',
            remitente: { nombre: 'Juan' }, // Should not be exposed strictly unless planned, but controller filters
            destinatario: { nombre: 'Maria' },
            updatedAt: new Date().toISOString()
        };

        const mockDocs = [
            {
                id: 'rec-123',
                data: () => mockRecoleccionData
            }
        ];

        // Spy on the collection chain for 'recolecciones' -> where -> limit -> get
        // This is tricky with the global mock structure, we need to ensure the chain returns our mock

        // We can spy on db.collection
        // When called with 'recolecciones', return a chain that eventually returns mockDocs
        // When called with 'companies', return company data

        // We need to match the query chain: db.collection().where().limit().get()
        const queryChain = {
            where: vi.fn().mockReturnThis(),
            limit: vi.fn().mockReturnThis(),
            get: vi.fn().mockResolvedValue({
                empty: false,
                docs: mockDocs
            })
        };

        const emptyChain = {
            where: vi.fn().mockReturnThis(),
            limit: vi.fn().mockReturnThis(),
            get: vi.fn().mockResolvedValue({
                empty: true,
                docs: []
            })
        };

        // We mock the collection method to return our chain
        const collectionSpy = vi.spyOn(db, 'collection');
        collectionSpy.mockImplementation((name) => {
            if (name === 'recolecciones') return queryChain;
            if (name === 'companies') return {
                doc: vi.fn().mockReturnValue({
                    get: vi.fn().mockResolvedValue({
                        exists: true,
                        data: () => ({ nombre: 'Transportes Rápidos' })
                    })
                })
            };
            return emptyChain;
        });

        const response = await request(app).get(`/api/tracking/public/${mockCodigo}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.recoleccion.codigoTracking).toBe(mockCodigo);
        expect(response.body.recoleccion.nombreEmpresa).toBe('Transportes Rápidos');

        // Verify timeline presence
        expect(response.body.timeline).toBeInstanceOf(Array);
    });

    it('GET /api/tracking/public/:codigo debe devolver 404 si no existe', async () => {
        const emptyChain = {
            where: vi.fn().mockReturnThis(),
            limit: vi.fn().mockReturnThis(),
            get: vi.fn().mockResolvedValue({
                empty: true,
                docs: []
            })
        };

        const collectionSpy = vi.spyOn(db, 'collection');
        collectionSpy.mockImplementation(() => emptyChain);

        const response = await request(app).get('/api/tracking/public/EMI-RC-9999');
        expect(response.status).toBe(404);
    });
});

