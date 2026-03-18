import { Page, Route, Request } from '@playwright/test';

/**
 * API Mock Configuration Options
 */
export interface MockAssinafyApiOptions {
    /**
     * Mock upload document endpoint
     */
    uploadDocument?: {
        documentId?: string;
        status?: string;
        delay?: number;
        error?: boolean;
    };

    /**
     * Mock create virtual assignment endpoint
     */
    createVirtualAssignment?: {
        assignmentId?: string;
        status?: string;
        delay?: number;
        error?: boolean;
    };

    /**
     * Mock create collect assignment endpoint
     */
    createCollectAssignment?: {
        assignmentId?: string;
        status?: string;
        delay?: number;
        error?: boolean;
    };

    /**
     * Mock list signers endpoint
     */
    listSigners?: {
        signers?: Array<{
            id: string;
            fullName: string;
            email: string;
        }>;
        delay?: number;
        error?: boolean;
    };

    /**
     * Mock get document endpoint
     */
    getDocument?: {
        document?: {
            id: string;
            title: string;
            status: string;
            signatureMethod: string;
        };
        delay?: number;
        error?: boolean;
    };

    /**
     * Mock download artifact endpoint
     */
    downloadArtifact?: {
        artifactType?: 'original' | 'certificated' | 'certificate-page' | 'bundle';
        delay?: number;
        error?: boolean;
    };

    /**
     * Mock webhook event types endpoint
     */
    getWebhookEventTypes?: {
        eventTypes?: string[];
        delay?: number;
        error?: boolean;
    };
}

/**
 * Default mock responses
 */
const DEFAULT_MOCKS: MockAssinafyApiOptions = {
    uploadDocument: {
        documentId: 'doc_mock_' + Math.random().toString(36).substr(2, 9),
        status: 'metadata_processing',
    },
    createVirtualAssignment: {
        assignmentId: 'assign_virtual_' + Math.random().toString(36).substr(2, 9),
        status: 'pending',
    },
    createCollectAssignment: {
        assignmentId: 'assign_collect_' + Math.random().toString(36).substr(2, 9),
        status: 'pending',
    },
    listSigners: {
        signers: [
            {
                id: 'signer_1',
                fullName: 'João Silva',
                email: 'joao.silva@example.com',
            },
            {
                id: 'signer_2',
                fullName: 'Maria Santos',
                email: 'maria.santos@example.com',
            },
        ],
    },
    getDocument: {
        document: {
            id: 'doc_1',
            title: 'Documento de Teste',
            status: 'metadata_ready',
            signatureMethod: 'virtual',
        },
    },
    getWebhookEventTypes: {
        eventTypes: [
            'document.uploaded',
            'document.metadata_ready',
            'document.pending_signature',
            'document.certificated',
            'document.rejected_by_signer',
            'document.rejected_by_user',
            'document.failed',
            'document.expired',
            'signer.signed',
            'signer.declined',
            'signer.viewed',
        ],
    },
};

/**
 * Mock Assinafy API Responses
 *
 * This helper sets up route handlers to mock the Assinafy API responses.
 * Use this in tests to avoid making real API calls and ensure consistent test data.
 */
export async function mockAssinafyApi(page: Page, options: MockAssinafyApiOptions = {}): Promise<void> {
    const opts = { ...DEFAULT_MOCKS, ...options };

    // ========================================================================
    // Upload Document Endpoint
    // ========================================================================
    await page.route('**/api/assinafy/documents/upload', (route: Route) => {
        const mock = opts.uploadDocument;
        const delay = mock?.delay || 0;

        setTimeout(() => {
            if (mock?.error) {
                route.fulfill({
                    status: 400,
                    contentType: 'application/json',
                    body: JSON.stringify({
                        error: 'Invalid PDF format',
                        message: 'O arquivo enviado não é um PDF válido',
                    }),
                });
            } else {
                route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({
                        document_id: mock?.documentId || DEFAULT_MOCKS.uploadDocument!.documentId,
                        status: mock?.status || DEFAULT_MOCKS.uploadDocument!.status,
                        message: 'Documento enviado com sucesso',
                    }),
                });
            }
        }, delay);
    });

    // ========================================================================
    // Create Virtual Assignment Endpoint
    // ========================================================================
    await page.route('**/api/assinafy/assignments/virtual', (route: Route) => {
        const mock = opts.createVirtualAssignment;
        const delay = mock?.delay || 0;

        setTimeout(() => {
            if (mock?.error) {
                route.fulfill({
                    status: 400,
                    contentType: 'application/json',
                    body: JSON.stringify({
                        error: 'Invalid assignment data',
                    }),
                });
            } else {
                route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({
                        assignment_id: mock?.assignmentId || DEFAULT_MOCKS.createVirtualAssignment!.assignmentId,
                        status: mock?.status || DEFAULT_MOCKS.createVirtualAssignment!.status,
                        message: 'Solicitação de assinatura criada com sucesso',
                    }),
                });
            }
        }, delay);
    });

    // ========================================================================
    // Create Collect Assignment Endpoint
    // ========================================================================
    await page.route('**/api/assinafy/assignments/collect', (route: Route) => {
        const mock = opts.createCollectAssignment;
        const delay = mock?.delay || 0;

        setTimeout(() => {
            if (mock?.error) {
                route.fulfill({
                    status: 400,
                    contentType: 'application/json',
                    body: JSON.stringify({
                        error: 'Invalid fields configuration',
                    }),
                });
            } else {
                route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({
                        assignment_id: mock?.assignmentId || DEFAULT_MOCKS.createCollectAssignment!.assignmentId,
                        status: mock?.status || DEFAULT_MOCKS.createCollectAssignment!.status,
                        message: 'Assignment collect criado com sucesso',
                    }),
                });
            }
        }, delay);
    });

    // ========================================================================
    // List Signers Endpoint
    // ========================================================================
    await page.route('**/api/assinafy/signers', (route: Route) => {
        const mock = opts.listSigners;
        const delay = mock?.delay || 0;

        setTimeout(() => {
            if (mock?.error) {
                route.fulfill({
                    status: 500,
                    contentType: 'application/json',
                    body: JSON.stringify({
                        error: 'Failed to fetch signers',
                    }),
                });
            } else {
                route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({
                        data: mock?.signers || DEFAULT_MOCKS.listSigners!.signers,
                        meta: {
                            current_page: 1,
                            per_page: 15,
                            total: (mock?.signers || DEFAULT_MOCKS.listSigners!.signers)?.length,
                        },
                    }),
                });
            }
        }, delay);
    });

    // ========================================================================
    // Get Document Endpoint
    // ========================================================================
    await page.route('**/api/assinafy/documents/*', (route: Route) => {
        const mock = opts.getDocument;
        const delay = mock?.delay || 0;

        setTimeout(() => {
            if (mock?.error) {
                route.fulfill({
                    status: 404,
                    contentType: 'application/json',
                    body: JSON.stringify({
                        error: 'Document not found',
                    }),
                });
            } else {
                route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({
                        data: mock?.document || DEFAULT_MOCKS.getDocument!.document,
                    }),
                });
            }
        }, delay);
    });

    // ========================================================================
    // Download Artifact Endpoint
    // ========================================================================
    await page.route('**/api/assinafy/documents/*/artifacts/*', (route: Route) => {
        const mock = opts.downloadArtifact;
        const delay = mock?.delay || 0;

        setTimeout(() => {
            if (mock?.error) {
                route.fulfill({
                    status: 404,
                    contentType: 'application/json',
                    body: JSON.stringify({
                        error: 'Artifact not found',
                    }),
                });
            } else {
                // Return a dummy PDF
                route.fulfill({
                    status: 200,
                    contentType: 'application/pdf',
                    body: Buffer.from('%PDF-1.4\n%mock pdf content'),
                });
            }
        }, delay);
    });

    // ========================================================================
    // Webhook Event Types Endpoint
    // ========================================================================
    await page.route('**/api/assinafy/webhooks/event-types', (route: Route) => {
        const mock = opts.getWebhookEventTypes;
        const delay = mock?.delay || 0;

        setTimeout(() => {
            route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    data: mock?.eventTypes || DEFAULT_MOCKS.getWebhookEventTypes!.eventTypes,
                }),
            });
        }, delay);
    });

    // ========================================================================
    // Create Signer Endpoint
    // ========================================================================
    await page.route('**/api/assinafy/signers', (route) => {
        if (route.request().method() === 'POST') {
            setTimeout(() => {
                route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({
                        signer_id: 'signer_' + Math.random().toString(36).substr(2, 9),
                        message: 'Signatário criado com sucesso',
                    }),
                });
            }, 100);
        } else {
            route.continue();
        }
    });

    // ========================================================================
    // Get Signer by ID Endpoint
    // ========================================================================
    await page.route('**/api/assinafy/signers/*', (route) => {
        if (route.request().method() === 'GET') {
            setTimeout(() => {
                route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({
                        data: {
                            id: 'signer_1',
                            full_name: 'João Silva',
                            email: 'joao.silva@example.com',
                            whatsapp_phone_number: '+5511999999999',
                            document_number: '123.456.789-00',
                            created_at: new Date().toISOString(),
                        },
                    }),
                });
            }, 100);
        } else {
            route.continue();
        }
    });
}

/**
 * Mock API Error Response
 *
 * Helper to mock specific error responses from the API.
 */
export async function mockApiError(
    page: Page,
    endpoint: string,
    status: number = 500,
    error: string = 'Internal Server Error'
): Promise<void> {
    await page.route(`**${endpoint}`, (route) => {
        route.fulfill({
            status,
            contentType: 'application/json',
            body: JSON.stringify({ error }),
        });
    });
}

/**
 * Mock Slow Network Response
 *
 * Simulates slow network conditions for testing loading states.
 */
export async function mockSlowNetwork(page: Page, endpointPattern: string, delay: number = 5000): Promise<void> {
    await page.route(endpointPattern, (route) => {
        setTimeout(() => route.continue(), delay);
    });
}

/**
 * Intercept and Log API Requests
 *
 * Useful for debugging - logs all API requests and responses.
 */
export async function logApiRequests(page: Page): Promise<void> {
    page.on('request', (request: Request) => {
        if (request.url().includes('/api/')) {
            console.log(`[API Request] ${request.method()} ${request.url()}`);
        }
    });

    page.on('response', (response) => {
        if (response.url().includes('/api/')) {
            console.log(`[API Response] ${response.status()} ${response.url()}`);
        }
    });
}

/**
 * Mock Webhook Payload
 *
 * Returns mock webhook payloads for testing webhook processing.
 */
export function mockWebhookPayload(eventType: string, data?: any): object {
    const basePayload = {
        id: 'webhook_' + Math.random().toString(36).substr(2, 9),
        event: eventType,
        occurred_at: new Date().toISOString(),
        data: data || {},
    };

    switch (eventType) {
        case 'document.signed':
            return {
                ...basePayload,
                data: {
                    document_id: data?.documentId || 'doc_1',
                    status: 'certificated',
                    signed_at: new Date().toISOString(),
                    ...data,
                },
            };

        case 'document.metadata_ready':
            return {
                ...basePayload,
                data: {
                    document_id: data?.documentId || 'doc_1',
                    status: 'metadata_ready',
                    page_count: data?.pageCount || 3,
                    ...data,
                },
            };

        case 'signer.declined':
            return {
                ...basePayload,
                data: {
                    document_id: data?.documentId || 'doc_1',
                    signer_id: data?.signerId || 'signer_1',
                    reason: data?.reason || 'Documento não reconhecido',
                    declined_at: new Date().toISOString(),
                    ...data,
                },
            };

        default:
            return basePayload;
    }
}

/**
 * Mock Authentication State
 *
 * Mocks an authenticated session for testing.
 */
export async function mockAuthState(page: Page, user: { email: string; name: string }): Promise<void> {
    // Add authorization header to all requests
    await page.route('**', (route) => {
        const headers = route.request().headers();
        headers['Authorization'] = `Bearer mock_token_${user.email}`;
        route.continue({ headers });
    });

    // Set mock session in localStorage
    await page.goto('/');
    await page.evaluate((userData) => {
        localStorage.setItem('auth_token', 'mock_token_' + userData.email);
        localStorage.setItem('user', JSON.stringify(userData));
    }, user);
}
