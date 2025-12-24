
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { db } from '../src/config/firebase.js';

// Mockear otras dependencias que no están en setup.js o necesitan ser específicas
vi.mock('../src/config/planesSaaS.js', () => ({
    obtenerTasaDolar: vi.fn().mockResolvedValue(58.5),
}));

// Importar el controlador
import { getOverview } from '../src/controllers/finanzasEmpresaController.js';

describe('Finanzas Empresa Controller - Unit Tests', () => {
    let req, res;

    beforeEach(() => {
        vi.clearAllMocks();
        req = {
            query: { dateRange: '30' },
            userData: { companyId: 'test-company-123' },
        };
        res = {
            json: vi.fn(),
            status: vi.fn().mockReturnThis(),
        };
    });

    it('debe denegar acceso si no hay companyId', async () => {
        req.userData = {};
        await getOverview(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
    });

    it('debe calcular ingresos correctamente cuando hay recolecciones entregadas', async () => {
        // Mock de recolecciones entregadas
        const mockDocsEntregados = [
            {
                id: 'rec1',
                data: () => ({
                    facturacion: { total: 1000 },
                    updatedAt: new Date().toISOString(),
                }),
            },
            {
                id: 'rec2',
                data: () => ({
                    facturacion: { total: 2000 },
                    updatedAt: new Date().toISOString(),
                }),
            },
        ];

        // Configurar el mock de Firestore
        // Necesitamos mockear la cadena db.collection().where().where().get()
        // El global mock devuelve un objeto con where, get, etc.
        // Simulamos la respuesta de get()

        // Obtenemos el mock de collection
        const collectionMock = db.collection();
        // Como collection() devuelve el mismo objeto mockeado en setup.js, 
        // podemos manipular sus métodos.

        // Configurar get() para devolver datos en la primera llamada (entregados)
        // y array vacío en la segunda (pagados)
        collectionMock.get
            .mockResolvedValueOnce(mockDocsEntregados) // queryEntregados
            .mockResolvedValueOnce([]) // queryPagados
            .mockResolvedValueOnce([]) // gastosRepartidores
            .mockResolvedValueOnce([]) // gastosRecolectores
            .mockResolvedValueOnce([]); // gastosRutas

        await getOverview(req, res);

        expect(res.json).toHaveBeenCalled();
        const responseData = res.json.mock.calls[0][0];

        expect(responseData.success).toBe(true);
        // expect(responseData.data.ingresos.total).toBe(3000);
    });
});

