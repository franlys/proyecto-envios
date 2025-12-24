import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../src/index.js';

describe('API Integration Tests', () => {
    it('GET /api/health debe responder 200 OK', async () => {
        const response = await request(app).get('/api/health');
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.status).toBe('OK');
    });

    it('GET /api/ruta-inexistente debe responder 404', async () => {
        const response = await request(app).get('/api/ruta-que-no-existe');
        expect(response.status).toBe(404);
    });
});
