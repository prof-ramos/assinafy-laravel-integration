import { test, expect } from '@playwright/test';
import { DocumentsPage, AssignmentMethod, type AssignmentData, type DocumentFormData } from '../Pages';
import { mockAssinafyApi, SAMPLE_PDF_BASE64 } from '../Helpers';

/**
 * E2E Tests: Signature Assignment
 *
 * Test suite covering signature assignment creation:
 * - Virtual assignments (internal, low risk)
 * - Collect assignments (positioned fields, high risk)
 * - Signer management in assignments
 * - Message and deadline configuration
 * - Sign order configuration
 */
test.describe('Signature Assignment', () => {
    let documentsPage: DocumentsPage;

    test.beforeEach(async ({ page }) => {
        documentsPage = new DocumentsPage(page);
        await mockAssinafyApi(page);
    });

    /**
     * =========================================================================
     * VIRTUAL ASSIGNMENT (Happy Path)
     * =========================================================================
     */
    test.describe('Virtual Assignment', () => {
        test('should create virtual assignment with single signer', async ({ page }) => {
            await documentsPage.goto();

            const documentData: DocumentFormData = {
                title: 'Virtual Assignment Test',
            };

            // First upload a document
            await documentsPage.uploadDocument(documentData, 'dummy.pdf');

            await test.step('Open signature modal', async () => {
                await documentsPage.clickCreateSignatureById('doc_mock_1');
                await documentsPage.assertSignatureModalVisible();
            });

            await test.step('Select virtual method', async () => {
                await documentsPage.selectAssignmentMethod(AssignmentMethod.VIRTUAL);
                await expect(documentsPage.virtualMethodRadio).toBeChecked();
            });

            await test.step('Add signer', async () => {
                await documentsPage.addSigner('signer1@example.com');
                await documentsPage.assertSignerInAssignment('signer1@example.com');
            });

            await test.step('Set message and deadline', async () => {
                await documentsPage.setSignatureMessage('Por favor, assine este documento.');
                await documentsPage.setDeadlineDays(7);
            });

            await test.step('Create assignment', async () => {
                await documentsPage.createAssignment();
                await expect(page.getByText(/solicitação criada|assignment created/i)).toBeVisible();
            });
        });

        test('should create virtual assignment with multiple signers', async ({ page }) => {
            await documentsPage.goto();

            await documentsPage.uploadDocument({ title: 'Multi Signer Test' }, 'dummy.pdf');
            await documentsPage.clickCreateSignatureById('doc_mock_1');

            const signers = [
                'joao@example.com',
                'maria@example.com',
                'carlos@example.com',
            ];

            await documentsPage.selectAssignmentMethod(AssignmentMethod.VIRTUAL);

            for (const email of signers) {
                await documentsPage.addSigner(email);
            }

            await documentsPage.createAssignment();

            // Verify all signers added
            for (const email of signers) {
                await expect(page.getByText(email)).toBeVisible();
            }
        });

        test('should create virtual assignment with sign order', async ({ page }) => {
            await documentsPage.goto();

            await documentsPage.uploadDocument({ title: 'Sign Order Test' }, 'dummy.pdf');
            await documentsPage.clickCreateSignatureById('doc_mock_1');

            await documentsPage.selectAssignmentMethod(AssignmentMethod.VIRTUAL);
            await documentsPage.addSigner('first@example.com');
            await documentsPage.addSigner('second@example.com');

            // Enable sign order
            await documentsPage.toggleSignOrder(true);

            // Verify order is shown
            await expect(
                page.getByText(/ordem de assinatura|sign order|assinam em sequência/i)
            ).toBeVisible();

            await documentsPage.createAssignment();
        });

        test('should create assignment without deadline (no expiration)', async ({ page }) => {
            await documentsPage.goto();

            await documentsPage.uploadDocument({ title: 'No Deadline Test' }, 'dummy.pdf');
            await documentsPage.clickCreateSignatureById('doc_mock_1');

            await documentsPage.selectAssignmentMethod(AssignmentMethod.VIRTUAL);
            await documentsPage.addSigner('signer@example.com');

            // Don't set deadline

            await documentsPage.createAssignment();

            // Verify success without deadline warning
            await expect(page.getByText(/criada com sucesso/i)).toBeVisible();
        });
    });

    /**
     * =========================================================================
     * COLLECT ASSIGNMENT (Positioned Fields)
     * =========================================================================
     */
    test.describe('Collect Assignment', () => {
        test('should create collect assignment with positioned signature fields', async ({ page }) => {
            await documentsPage.goto();

            const documentData: DocumentFormData = {
                title: 'Collect Assignment - Procuração',
            };

            await documentsPage.uploadDocument(documentData, 'dummy.pdf');
            await documentsPage.clickCreateSignatureById('doc_mock_1');

            await test.step('Select collect method', async () => {
                await documentsPage.selectAssignmentMethod(AssignmentMethod.COLLECT);
                await expect(documentsPage.collectMethodRadio).toBeChecked();
            });

            await test.step('Verify PDF preview appears', async () => {
                await expect(documentsPage.previewCanvas).toBeVisible();
            });

            await test.step('Add signer with positioned signature field', async () => {
                await documentsPage.addSigner('signer@example.com');
                await documentsPage.addSignatureFields([
                    {
                        type: 'signature',
                        page: 1,
                        x: 100,
                        y: 700,
                        width: 200,
                        height: 50,
                    },
                ]);
            });

            await test.step('Create assignment', async () => {
                await documentsPage.createAssignment();
                await expect(page.getByText(/assignment collect criado/i)).toBeVisible();
            });
        });

        test('should create collect assignment with multiple field types', async ({ page }) => {
            await documentsPage.goto();

            await documentsPage.uploadDocument({ title: 'Multiple Fields' }, 'dummy.pdf');
            await documentsPage.clickCreateSignatureById('doc_mock_1');

            await documentsPage.selectAssignmentMethod(AssignmentMethod.COLLECT);
            await documentsPage.addSigner('signer@example.com');

            // Add different field types
            await documentsPage.addSignatureFields([
                { type: 'signature', page: 1, x: 100, y: 700, width: 200, height: 50 },
                { type: 'initials', page: 1, x: 100, y: 650, width: 80, height: 40 },
                { type: 'text', page: 1, x: 100, y: 600, width: 200, height: 30 },
                { type: 'date', page: 1, x: 100, y: 550, width: 100, height: 30 },
            ]);

            await documentsPage.createAssignment();

            // Verify all fields added
            await expect(page.getByText(/4 campos/i)).toBeVisible();
        });

        test('should assign fields to specific signers', async ({ page }) => {
            await documentsPage.goto();

            await documentsPage.uploadDocument({ title: 'Multi Signer Fields' }, 'dummy.pdf');
            await documentsPage.clickCreateSignatureById('doc_mock_1');

            await documentsPage.selectAssignmentMethod(AssignmentMethod.COLLECT);

            // Add first signer with signature field
            await documentsPage.addSigner('joao@example.com');
            await documentsPage.addSignatureFields([
                { type: 'signature', page: 1, x: 100, y: 700, width: 200, height: 50, signerEmail: 'joao@example.com' },
            ]);

            // Add second signer with initials
            await documentsPage.addSigner('maria@example.com');
            await documentsPage.addSignatureFields([
                { type: 'initials', page: 1, x: 100, y: 650, width: 80, height: 40, signerEmail: 'maria@example.com' },
            ]);

            await documentsPage.createAssignment();

            // Verify fields assigned correctly
            await expect(page.getByText(/joão.*assinatura/i)).toBeVisible();
            await expect(page.getByText(/maria.*iniciais/i)).toBeVisible();
        });

        test('should allow editing field position on canvas', async ({ page }) => {
            await documentsPage.goto();

            await documentsPage.uploadDocument({ title: 'Edit Field Position' }, 'dummy.pdf');
            await documentsPage.clickCreateSignatureById('doc_mock_1');

            await documentsPage.selectAssignmentMethod(AssignmentMethod.COLLECT);
            await documentsPage.addSigner('signer@example.com');

            // Add a field
            await documentsPage.addFieldButton.click();

            // Drag field to new position
            const canvas = documentsPage.previewCanvas;
            const box = await canvas.boundingBox();

            if (box) {
                await page.mouse.move(box.x + 150, box.y + 700);
                await page.mouse.down();
                await page.mouse.move(box.x + 200, box.y + 750);
                await page.mouse.up();
            }

            // Verify new position
            const fieldPosition = await page.evaluate(() => {
                const field = document.querySelector('[data-testid="field-0"]');
                return field?.getAttribute('data-position');
            });

            expect(fieldPosition).toBeDefined();
        });
    });

    /**
     * =========================================================================
     * SIGNER MANAGEMENT
     * =========================================================================
     */
    test.describe('Signer Management in Assignment', () => {
        test('should remove signer from assignment', async ({ page }) => {
            await documentsPage.goto();

            await documentsPage.uploadDocument({ title: 'Remove Signer' }, 'dummy.pdf');
            await documentsPage.clickCreateSignatureById('doc_mock_1');

            await documentsPage.selectAssignmentMethod(AssignmentMethod.VIRTUAL);
            await documentsPage.addSigner('temporary@example.com');

            // Remove signer
            await page.getByRole('button', { name: /remover|remove/i }).first().click();

            // Verify removed
            await expect(page.getByText('temporary@example.com')).not.toBeVisible();
        });

        test('should validate signer email before adding', async ({ page }) => {
            await documentsPage.goto();

            await documentsPage.uploadDocument({ title: 'Validate Signer' }, 'dummy.pdf');
            await documentsPage.clickCreateSignatureById('doc_mock_1');

            await documentsPage.selectAssignmentMethod(AssignmentMethod.VIRTUAL);

            // Add invalid email
            await documentsPage.signerInput.fill('invalid-email');
            await documentsPage.addSignerButton.click();

            // Verify validation error
            await expect(
                page.getByText(/e-mail inválido|invalid email/i)
            ).toBeVisible();
        });

        test('should prevent duplicate signers', async ({ page }) => {
            await documentsPage.goto();

            await documentsPage.uploadDocument({ title: 'Duplicate Signer' }, 'dummy.pdf');
            await documentsPage.clickCreateSignatureById('doc_mock_1');

            await documentsPage.selectAssignmentMethod(AssignmentMethod.VIRTUAL);

            const email = 'duplicate@example.com';

            // Add signer twice
            await documentsPage.addSigner(email);
            await documentsPage.signerInput.fill(email);
            await documentsPage.addSignerButton.click();

            // Verify duplicate warning
            await expect(
                page.getByText(/já adicionado|already added/i)
            ).toBeVisible();
        });

        test('should search existing signers to add', async ({ page }) => {
            await documentsPage.goto();

            await documentsPage.uploadDocument({ title: 'Search Signer' }, 'dummy.pdf');
            await documentsPage.clickCreateSignatureById('doc_mock_1');

            await documentsPage.selectAssignmentMethod(AssignmentMethod.VIRTUAL);

            // Type in search
            await documentsPage.signerInput.fill('joao');

            // Should show dropdown with existing signers
            await expect(
                page.getByRole('listbox', { name: /signatários|signers/i })
            ).toBeVisible();

            // Select from dropdown
            await page.getByRole('option', { name: /joão/i }).click();

            // Verify added
            await expect(page.getByText(/joão/i)).toBeVisible();
        });
    });

    /**
     * =========================================================================
     * VALIDATION
     * =========================================================================
     */
    test.describe('Validation', () => {
        test('should require at least one signer', async ({ page }) => {
            await documentsPage.goto();

            await documentsPage.uploadDocument({ title: 'No Signer' }, 'dummy.pdf');
            await documentsPage.clickCreateSignatureById('doc_mock_1');

            await documentsPage.selectAssignmentMethod(AssignmentMethod.VIRTUAL);

            // Try to create without signers
            await documentsPage.createAssignment();

            // Verify error
            await expect(
                page.getByText(/pelo menos um signatário|at least one signer/i)
            ).toBeVisible();
        });

        test('should validate deadline is in the future', async ({ page }) => {
            await documentsPage.goto();

            await documentsPage.uploadDocument({ title: 'Invalid Deadline' }, 'dummy.pdf');
            await documentsPage.clickCreateSignatureById('doc_mock_1');

            await documentsPage.selectAssignmentMethod(AssignmentMethod.VIRTUAL);
            await documentsPage.addSigner('signer@example.com');

            // Set past deadline
            await documentsPage.setDeadlineDays(-7);
            await documentsPage.createAssignment();

            // Verify error
            await expect(
                page.getByText(/data inválida|invalid date|deve ser futura/i)
            ).toBeVisible();
        });

        test('should validate message length', async ({ page }) => {
            await documentsPage.goto();

            await documentsPage.uploadDocument({ title: 'Long Message' }, 'dummy.pdf');
            await documentsPage.clickCreateSignatureById('doc_mock_1');

            await documentsPage.selectAssignmentMethod(AssignmentMethod.VIRTUAL);
            await documentsPage.addSigner('signer@example.com');

            // Set very long message (> 1000 chars)
            const longMessage = 'A'.repeat(1001);
            await documentsPage.messageInput.fill(longMessage);
            await documentsPage.messageInput.blur();

            // Verify validation
            await expect(
                page.getByText(/muito longa|too long|máximo.*caracteres/i)
            ).toBeVisible();
        });
    });

    /**
     * =========================================================================
     * ERROR HANDLING
     * =========================================================================
     */
    test.describe('Error Handling', () => {
        test('should handle API error when creating assignment', async ({ page }) => {
            // Mock API error after selection
            await page.route('**/api/assignments/**', (route) => {
                route.fulfill({
                    status: 500,
                    contentType: 'application/json',
                    body: JSON.stringify({ error: 'Failed to create assignment' }),
                });
            });

            await documentsPage.goto();
            await documentsPage.uploadDocument({ title: 'API Error' }, 'dummy.pdf');
            await documentsPage.clickCreateSignatureById('doc_mock_1');

            await documentsPage.selectAssignmentMethod(AssignmentMethod.VIRTUAL);
            await documentsPage.addSigner('signer@example.com');
            await documentsPage.createAssignment();

            // Verify error shown and modal stays open
            await expect(page.getByText(/erro ao criar|failed to create/i)).toBeVisible();
            await expect(documentsPage.signatureModal).toBeVisible();
        });

        test('should handle network timeout', async ({ page }) => {
            await page.route('**/api/assignments/**', () => {
                // Never respond - timeout
            });

            await documentsPage.goto();
            await documentsPage.uploadDocument({ title: 'Timeout' }, 'dummy.pdf');
            await documentsPage.clickCreateSignatureById('doc_mock_1');

            await documentsPage.selectAssignmentMethod(AssignmentMethod.VIRTUAL);
            await documentsPage.addSigner('signer@example.com');
            await documentsPage.createAssignment();

            // Verify timeout error
            await expect(
                page.getByText(/tempo esgotado|timeout/i)
            ).toBeVisible({ timeout: 35000 });
        });
    });

    /**
     * =========================================================================
     * CANCEL AND CLOSE
     * =========================================================================
     */
    test.describe('Cancel and Close', () => {
        test('should close modal without creating assignment', async ({ page }) => {
            await documentsPage.goto();

            await documentsPage.uploadDocument({ title: 'Cancel' }, 'dummy.pdf');
            await documentsPage.clickCreateSignatureById('doc_mock_1');

            await documentsPage.selectAssignmentMethod(AssignmentMethod.VIRTUAL);
            await documentsPage.addSigner('signer@example.com');

            // Close modal
            await page.getByRole('button', { name: /cancelar|fechar|close/i }).click();

            // Verify modal closed and no assignment created
            await expect(documentsPage.signatureModal).not.toBeVisible();
        });

        test('should show confirmation when closing with data', async ({ page }) => {
            await documentsPage.goto();

            await documentsPage.uploadDocument({ title: 'Confirm Close' }, 'dummy.pdf');
            await documentsPage.clickCreateSignatureById('doc_mock_1');

            await documentsPage.selectAssignmentMethod(AssignmentMethod.VIRTUAL);
            await documentsPage.addSigner('signer@example.com');
            await documentsPage.setSignatureMessage('Important message');

            // Try to close
            await page.keyboard.press('Escape');

            // Verify confirmation
            await expect(
                page.getByText(/descartar alterações|discard changes/i)
            ).toBeVisible();
        });
    });

    /**
     * =========================================================================
     * ACCESSIBILITY
     * =========================================================================
     */
    test.describe('Accessibility', () => {
        test('should be keyboard navigable', async ({ page }) => {
            await documentsPage.goto();

            await documentsPage.uploadDocument({ title: 'A11y' }, 'dummy.pdf');
            await documentsPage.clickCreateSignatureById('doc_mock_1');

            // Tab through form
            await page.keyboard.press('Tab');
            await expect(documentsPage.virtualMethodRadio).toBeFocused();

            await page.keyboard.press('Tab');
            await expect(documentsPage.signerInput).toBeFocused();

            // Select virtual method with keyboard
            await page.keyboard.press('Space');
            await expect(documentsPage.virtualMethodRadio).toBeChecked();
        });
    });
});
