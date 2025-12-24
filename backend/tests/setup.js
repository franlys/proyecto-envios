import { vi } from 'vitest';

// Mock Resend
vi.mock('resend', () => {
    return {
        Resend: vi.fn().mockImplementation(() => ({
            emails: {
                send: vi.fn().mockResolvedValue({ id: 'mock-email-id' }),
            },
        })),
    };
});


// Global mock for firebase config to prevent process.exit(1)
// Fix: Use string path relative to this setup file
vi.mock('../src/config/firebase.js', () => {
    const collectionMock = {
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        get: vi.fn().mockResolvedValue({
            empty: true,
            docs: [],
            forEach: () => { },
            size: 0
        }),
        doc: vi.fn(() => ({
            get: vi.fn().mockResolvedValue({ exists: false }),
            set: vi.fn(),
            update: vi.fn(),
            delete: vi.fn(),
        })),
        add: vi.fn(),
    };

    return {
        db: {
            collection: vi.fn(() => collectionMock),
            runTransaction: vi.fn(async (callback) => {
                const transactionMock = {
                    get: vi.fn().mockResolvedValue({
                        exists: true,
                        data: () => ({ recolecciones_count: 10, prefijo: 'TEST' }),
                    }),
                    update: vi.fn(),
                    set: vi.fn(),
                    delete: vi.fn(),
                };
                return callback(transactionMock);
            }),
            batch: vi.fn(() => ({
                update: vi.fn(),
                commit: vi.fn().mockResolvedValue(true),
                set: vi.fn(),
                delete: vi.fn()
            })),
        },
        auth: {
            createUser: vi.fn(),
            getUser: vi.fn(),
            getUserByEmail: vi.fn(),
            verifyIdToken: vi.fn().mockResolvedValue({ uid: 'test-uid' }),
        },
        storage: {
            bucket: vi.fn(() => ({
                file: vi.fn(() => ({
                    save: vi.fn(),
                    getSignedUrl: vi.fn().mockResolvedValue(['http://mock-url']),
                })),
            })),
        },
        admin: {
            initializeApp: vi.fn(),
            credential: { cert: vi.fn() },
            auth: vi.fn(() => ({})),
            firestore: vi.fn(() => ({})),
            storage: vi.fn(() => ({})),
        },
        default: {
            initializeApp: vi.fn(),
        }
    };
});

// Mock console.log/error to keep test output clean
global.console = {
    ...console,
    // log: vi.fn(),
    // error: vi.fn(),
};
