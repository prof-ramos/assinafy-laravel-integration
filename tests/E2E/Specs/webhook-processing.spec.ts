import { test, expect } from '@playwright/test';
import { DocumentsPage } from '../Pages';
import { mockWebhookPayload, mockAssinafyApi } from '../Helpers';

/**
 * E2E Tests: Webhook Processing
 *
 * Test suite covering webhook event processing:
 * - Document status updates
 * - Signer signed events
 * - Document completion
 * - Signature rejection
 * - Webhook authentication
 */
test.describe('Webhook Processing', () => {
    let documentsPage: DocumentsPage;

    test.beforeEach(async ({ page }) => {
        documentsPage = new DocumentsPage(page);
        await mockAssinafyApi(page);
    });

    /**
     * =========================================================================
     * DOCUMENT STATUS WEBHOOKS
     * =========================================================================
     */
    test.describe('Document Status Updates', () => {
        test('should update document to metadata_ready', async ({ page, request }) => {
            const documentId = 'doc_webhook_1';

            await test.step('Send metadata_ready webhook', async () => {
                const payload = mockWebhookPayload('document.metadata_ready', {
                    document_id: documentId,
                    status: 'metadata_ready',
                    page_count: 3,
                });

                const response = await request.post('/api/assinafy/webhook', {
                    data: payload,
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Assinafy-Signature': 'test_signature',
                    },
                });

                expect(response.ok()).toBeTruthy();
            });

            await test.step('Verify status updated in UI', async () => {
                await documentsPage.goto();
                await documentsPage.gotoDocument(documentId);
                await documentsPage.assertDetailViewLoaded('');
                await expect(page.getByText('metadata_ready')).toBeVisible();
            });
        });

        test('should update document to pending_signature', async ({ page, request }) => {
            const documentId = 'doc_webhook_2';

            const payload = mockWebhookPayload('document.pending_signature', {
                document_id: documentId,
                status: 'pending_signature',
            });

            const response = await request.post('/api/assinafy/webhook', {
                data: payload,
                headers: {
                    'Content-Type': 'application/json',
                    'X-Assinafy-Signature': 'test_signature',
                },
            });

            expect(response.ok()).toBeTruthy();

            // Verify UI update
            await page.reload();
            await expect(page.getByText('pending_signature')).toBeVisible();
        });

        test('should update document to certificated', async ({ page, request }) => {
            const documentId = 'doc_webhook_3';

            const payload = mockWebhookPayload('document.certificated', {
                document_id: documentId,
                status: 'certificated',
                certificated_at: new Date().toISOString(),
            });

            const response = await request.post('/api/assinafy/webhook', {
                data: payload,
                headers: {
                    'Content-Type': 'application/json',
                    'X-Assinafy-Signature': 'test_signature',
                },
            });

            expect(response.ok()).toBeTruthy();

            // Verify certificated status
            await page.reload();
            await expect(page.getByText('certificated')).toBeVisible();

            // Verify download available
            await expect(documentsPage.downloadCertificatedButton).toBeVisible();
        });

        test('should update document to expired', async ({ page, request }) => {
            const documentId = 'doc_webhook_4';

            const payload = mockWebhookPayload('document.expired', {
                document_id: documentId,
                status: 'expired',
                expired_at: new Date().toISOString(),
            });

            const response = await request.post('/api/assinafy/webhook', {
                data: payload,
                headers: {
                    'Content-Type': 'application/json',
                    'X-Assinafy-Signature': 'test_signature',
                },
            });

            expect(response.ok()).toBeTruthy();

            // Verify expired status
            await page.reload();
            await expect(page.getByText('expired')).toBeVisible();
        });
    });

    /**
     * =========================================================================
     * SIGNER EVENT WEBHOOKS
     * =========================================================================
     */
    test.describe('Signer Events', () => {
        test('should handle signer.signed event', async ({ page, request }) => {
            const documentId = 'doc_signer_1';
            const signerId = 'signer_1';

            const payload = mockWebhookPayload('signer.signed', {
                document_id: documentId,
                signer_id: signerId,
                signed_at: new Date().toISOString(),
            });

            const response = await request.post('/api/assinafy/webhook', {
                data: payload,
                headers: {
                    'Content-Type': 'application/json',
                    'X-Assinafy-Signature': 'test_signature',
                },
            });

            expect(response.ok()).toBeTruthy();

            // Verify signer marked as signed
            await documentsPage.gotoDocument(documentId);
            await expect(
                page.getByTestId(`signer-${signerId}`).getByText(/assinado|signed/i)
            ).toBeVisible();
        });

        test('should handle signer.declined event', async ({ page, request }) => {
            const documentId = 'doc_signer_2';
            const signerId = 'signer_2';

            const payload = mockWebhookPayload('signer.declined', {
                document_id: documentId,
                signer_id: signerId,
                reason: 'Documento não reconhecido',
                declined_at: new Date().toISOString(),
            });

            const response = await request.post('/api/assinafy/webhook', {
                data: payload,
                headers: {
                    'Content-Type': 'application/json',
                    'X-Assinafy-Signature': 'test_signature',
                },
            });

            expect(response.ok()).toBeTruthy();

            // Verify signer declined
            await documentsPage.gotoDocument(documentId);
            await expect(
                page.getByTestId(`signer-${signerId}`).getByText(/recusou|declined/i)
            ).toBeVisible();

            // Verify reason shown
            await expect(page.getByText('Documento não reconhecido')).toBeVisible();
        });

        test('should handle signer.viewed event', async ({ page, request }) => {
            const documentId = 'doc_signer_3';
            const signerId = 'signer_3';

            const payload = mockWebhookPayload('signer.viewed', {
                document_id: documentId,
                signer_id: signerId,
                viewed_at: new Date().toISOString(),
            });

            const response = await request.post('/api/assinafy/webhook', {
                data: payload,
                headers: {
                    'Content-Type': 'application/json',
                    'X-Assinafy-Signature': 'test_signature',
                },
            });

            expect(response.ok()).toBeTruthy();

            // Verify viewed status
            await documentsPage.gotoDocument(documentId);
            await expect(
                page.getByTestId(`signer-${signerId}`).getByText(/visualizado|viewed/i)
            ).toBeVisible();
        });
    });

    /**
     * =========================================================================
     * WEBHOOK AUTHENTICATION
     * =========================================================================
     */
    test.describe('Webhook Authentication', () => {
        test('should reject webhook without signature', async ({ page, request }) => {
            const response = await request.post('/api/assinafy/webhook', {
                data: mockWebhookPayload('document.uploaded'),
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            // Should fail without signature
            expect(response.status()).toBe(401);
        });

        test('should reject webhook with invalid signature', async ({ page, request }) => {
            const response = await request.post('/api/assinafy/webhook', {
                data: mockWebhookPayload('document.uploaded'),
                headers: {
                    'Content-Type': 'application/json',
                    'X-Assinafy-Signature': 'invalid_signature',
                },
            });

            // Should fail with invalid signature
            expect(response.status()).toBe(401);
        });

        test('should accept webhook with valid signature', async ({ page, request }) => {
            const response = await request.post('/api/assinafy/webhook', {
                data: mockWebhookPayload('document.uploaded'),
                headers: {
                    'Content-Type': 'application/json',
                    'X-Assinafy-Signature': 'test_signature',
                },
            });

            // Should succeed with valid signature
            expect(response.ok()).toBeTruthy();
        });
    });

    /**
     * =========================================================================
     * WEBHOOK ERROR HANDLING
     * =========================================================================
     */
    test.describe('Webhook Error Handling', () => {
        test('should handle malformed webhook payload', async ({ page, request }) => {
            const response = await request.post('/api/assinafy/webhook', {
                data: '{ invalid json }',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Assinafy-Signature': 'test_signature',
                },
            });

            expect(response.status()).toBe(400);
        });

        test('should handle missing required fields', async ({ page, request }) => {
            const response = await request.post('/api/assinafy/webhook', {
                data: JSON.stringify({
                    event: 'document.signed',
                    // Missing 'data' field
                }),
                headers: {
                    'Content-Type': 'application/json',
                    'X-Assinafy-Signature': 'test_signature',
                },
            });

            expect(response.status()).toBe(400);
        });

        test('should handle unknown event type', async ({ page, request }) => {
            const response = await request.post('/api/assinafy/webhook', {
                data: JSON.stringify({
                    id: 'webhook_1',
                    event: 'unknown.event',
                    occurred_at: new Date().toISOString(),
                    data: {},
                }),
                headers: {
                    'Content-Type': 'application/json',
                    'X-Assinafy-Signature': 'test_signature',
                },
            });

            // Should accept but log warning
            expect(response.ok()).toBeTruthy();
        });

        test('should handle non-existent document', async ({ page, request }) => {
            const response = await request.post('/api/assinafy/webhook', {
                data: mockWebhookPayload('document.certificated', {
                    document_id: 'non_existent_doc',
                }),
                headers: {
                    'Content-Type': 'application/json',
                    'X-Assinafy-Signature': 'test_signature',
                },
            });

            // Should still return 200 to acknowledge webhook
            expect(response.ok()).toBeTruthy();
        });
    });

    /**
     * =========================================================================
     * WEBHOOK RETRY
     * =========================================================================
     */
    test.describe('Webhook Retry Logic', () => {
        test('should return 500 on error to trigger retry', async ({ page, request }) => {
            // Mock database error
            await page.route('**/api/assinafy/webhook', (route) => {
                if (route.request().method() === 'POST') {
                    // Simulate server error
                    route.fulfill({
                        status: 500,
                        contentType: 'application/json',
                        body: JSON.stringify({ error: 'Database error' }),
                    });
                }
            });

            const response = await request.post('/api/assinafy/webhook', {
                data: mockWebhookPayload('document.uploaded'),
                headers: {
                    'Content-Type': 'application/json',
                    'X-Assinafy-Signature': 'test_signature',
                },
            });

            expect(response.status()).toBe(500);
        });

        test('should log failed webhook for manual retry', async ({ page, request }) => {
            // After failed webhook, check dispatch logs
            const response = await request.get('/api/webhooks/dispatches').catch(() => null);

            if (response && response.ok()) {
                const data = await response.json();
                expect(data).toHaveProperty('data');
            }
        });
    });

    /**
     * =========================================================================
     * MULTIPLE WEBHOOKS
     * =========================================================================
     */
    test.describe('Multiple Webhook Events', () => {
        test('should process sequential webhooks for same document', async ({ page, request }) => {
            const documentId = 'doc_sequential_1';

            const events = [
                mockWebhookPayload('document.uploaded', { document_id: documentId }),
                mockWebhookPayload('document.metadata_ready', { document_id: documentId }),
                mockWebhookPayload('document.pending_signature', { document_id: documentId }),
            ];

            for (const event of events) {
                const response = await request.post('/api/assinafy/webhook', {
                    data: event,
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Assinafy-Signature': 'test_signature',
                    },
                });

                expect(response.ok()).toBeTruthy();
            }

            // Verify final status
            await documentsPage.gotoDocument(documentId);
            await expect(page.getByText('pending_signature')).toBeVisible();
        });

        test('should handle concurrent webhooks', async ({ page, request }) => {
            // Send multiple webhooks simultaneously
            const requests = [
                request.post('/api/assinafy/webhook', {
                    data: mockWebhookPayload('signer.signed', {
                        document_id: 'doc_concurrent_1',
                        signer_id: 'signer_1',
                    }),
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Assinafy-Signature': 'test_signature',
                    },
                }),
                request.post('/api/assinafy/webhook', {
                    data: mockWebhookPayload('signer.signed', {
                        document_id: 'doc_concurrent_1',
                        signer_id: 'signer_2',
                    }),
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Assinafy-Signature': 'test_signature',
                    },
                }),
            ];

            const responses = await Promise.all(requests);

            for (const response of responses) {
                expect(response.ok()).toBeTruthy();
            }
        });
    });
});
