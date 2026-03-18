import { test, expect } from '@playwright/test';
import { SignersPage, type SignerFormData } from '../Pages';
import { mockAssinafyApi, generateTestEmail, VALID_CPFS } from '../Helpers';

/**
 * E2E Tests: Signer Management
 *
 * Test suite covering all signer-related functionality:
 * - Creating new signers
 * - Validating signer data
 * - Listing and searching signers
 * - Editing signer information
 * - Deleting signers
 */
test.describe('Signer Management', () => {
    let signersPage: SignersPage;

    test.beforeEach(async ({ page }) => {
        signersPage = new SignersPage(page);
        await mockAssinafyApi(page);
    });

    /**
     * =========================================================================
     * HAPPY PATHS
     * =========================================================================
     */
    test.describe('Happy Paths', () => {
        test('should display signers page with empty state', async ({ page }) => {
            await signersPage.goto();
            await signersPage.assertIsLoaded();

            // Verify page structure
            await expect(signersPage.heading).toBeVisible();
            await expect(signersPage.newSignerButton).toBeVisible();
            await expect(signersPage.searchInput).toBeVisible();
        });

        test('should create a new signer successfully', async ({ page }) => {
            await signersPage.goto();

            const signerData: SignerFormData = {
                fullName: 'João Silva',
                email: generateTestEmail('joao'),
                phone: '+5511999999999',
                documentType: 'cpf',
                documentNumber: VALID_CPFS[0],
            };

            await test.step('Open new signer form', async () => {
                await signersPage.clickNewSigner();
                await signersPage.assertUploadModalVisible();
            });

            await test.step('Fill signer form', async () => {
                await signersPage.fillSignerForm(signerData);
            });

            await test.step('Submit form', async () => {
                await signersPage.submitForm();
                await signersPage.assertSuccess('criado com sucesso');
                await signersPage.assertSignerVisible(signerData.email);
            });
        });

        test('should create multiple signers in sequence', async ({ page }) => {
            await signersPage.goto();

            const signers = [
                {
                    fullName: 'Ana Souza',
                    email: generateTestEmail('ana'),
                    phone: '+5511888888888',
                    documentType: 'cpf' as const,
                    documentNumber: VALID_CPFS[1],
                },
                {
                    fullName: 'Carlos Oliveira',
                    email: generateTestEmail('carlos'),
                    phone: '+5511777777777',
                    documentType: 'cpf' as const,
                    documentNumber: VALID_CPFS[2],
                },
                {
                    fullName: 'Empresa XYZ LTDA',
                    email: generateTestEmail('empresa'),
                    phone: '+5511666666666',
                    documentType: 'cnpj' as const,
                    documentNumber: '12.345.678/0001-95',
                },
            ];

            for (const signer of signers) {
                await signersPage.createSigner(signer);
                await signersPage.assertSignerVisible(signer.email);
            }
        });

        test('should search for signer by email', async ({ page }) => {
            await signersPage.goto();

            const testEmail = 'search.test@example.com';

            // First create a signer
            await signersPage.createSigner({
                fullName: 'Search Test User',
                email: testEmail,
                phone: '+5511555555555',
                documentType: 'cpf',
                documentNumber: VALID_CPFS[0],
            });

            await test.step('Search for existing signer', async () => {
                await signersPage.search(testEmail);
                await signersPage.assertSearchResultCount(1);
                await signersPage.assertSignerVisible(testEmail);
            });

            await test.step('Clear search', async () => {
                await signersPage.clearSearch();
                await expect(signersPage.searchInput).toHaveValue('');
            });
        });

        test('should search for signer by name', async ({ page }) => {
            await signersPage.goto();

            const testName = 'Maria Santos de Oliveira';

            // Create signer
            await signersPage.createSigner({
                fullName: testName,
                email: generateTestEmail('maria'),
                phone: '+5511444444444',
                documentType: 'cpf',
                documentNumber: VALID_CPFS[1],
            });

            // Search by partial name
            await signersPage.search('Maria');
            await signersPage.assertSignerVisible('maria');
        });

        test('should display signer details when clicking on signer', async ({ page }) => {
            await signersPage.goto();

            const signerData: SignerFormData = {
                fullName: 'Detail Test User',
                email: generateTestEmail('detail'),
                phone: '+5511333333333',
                documentType: 'cpf',
                documentNumber: VALID_CPFS[0],
            };

            await signersPage.createSigner(signerData);

            // Click on signer
            await signersPage.clickSigner(signerData.email);

            // Verify detail view
            await expect(page.getByText(signerData.fullName)).toBeVisible();
            await expect(page.getByText(signerData.email)).toBeVisible();
        });
    });

    /**
     * =========================================================================
     * VALIDATION
     * =========================================================================
     */
    test.describe('Form Validation', () => {
        test('should validate required fields', async ({ page }) => {
            await signersPage.goto();
            await signersPage.clickNewSigner();

            // Submit without filling any fields
            await signersPage.submitForm();

            // Check for validation errors
            await signersPage.assertFieldError('fullName', /required|obrigatório/i);
            await signersPage.assertFieldError('email', /required|obrigatório/i);
        });

        test('should validate email format', async ({ page }) => {
            await signersPage.goto();
            await signersPage.clickNewSigner();

            // Fill with invalid email
            await signersPage.fillSignerForm({
                fullName: 'Test User',
                email: 'invalid-email',
                phone: '+5511999999999',
                documentType: 'cpf',
                documentNumber: VALID_CPFS[0],
            });

            await signersPage.submitForm();

            // Check email validation
            await signersPage.assertFieldError('email', /inválido|invalid/i);
        });

        test('should validate CPF format', async ({ page }) => {
            await signersPage.goto();
            await signersPage.clickNewSigner();

            // Fill with invalid CPF
            await signersPage.fillSignerForm({
                fullName: 'Test User',
                email: generateTestEmail('cpf'),
                phone: '+5511999999999',
                documentType: 'cpf',
                documentNumber: '123.456.789-00', // Invalid checksum
            });

            await signersPage.submitForm();

            // Check CPF validation
            await signersPage.assertFieldError('documentNumber', /inválido|invalid/i);
        });

        test('should validate CNPJ format when selected', async ({ page }) => {
            await signersPage.goto();
            await signersPage.clickNewSigner();

            // Fill with invalid CNPJ
            await signersPage.fillSignerForm({
                fullName: 'Empresa Teste',
                email: generateTestEmail('empresa'),
                phone: '+5511999999999',
                documentType: 'cnpj',
                documentNumber: '12.345.678/0001-00', // Invalid checksum
            });

            await signersPage.submitForm();

            // Check CNPJ validation
            await signersPage.assertFieldError('documentNumber', /inválido|invalid/i);
        });

        test('should validate phone format', async ({ page }) => {
            await signersPage.goto();
            await signersPage.clickNewSigner();

            // Fill with invalid phone (too short)
            await signersPage.fillSignerForm({
                fullName: 'Test User',
                email: generateTestEmail('phone'),
                phone: '+55119',
                documentType: 'cpf',
                documentNumber: VALID_CPFS[0],
            });

            await signersPage.submitForm();

            // Check phone validation
            await expect(
                signersPage.formModal.getByText(/telefone inválido|invalid phone/i)
            ).toBeVisible();
        });

        test('should not allow duplicate email', async ({ page }) => {
            await signersPage.goto();

            const email = generateTestEmail('duplicate');

            // Create first signer
            await signersPage.createSigner({
                fullName: 'First User',
                email,
                phone: '+5511999999999',
                documentType: 'cpf',
                documentNumber: VALID_CPFS[0],
            });

            // Try to create duplicate
            await signersPage.clickNewSigner();
            await signersPage.fillSignerForm({
                fullName: 'Second User',
                email, // Same email
                phone: '+5511888888888',
                documentType: 'cpf',
                documentNumber: VALID_CPFS[1],
            });

            await signersPage.submitForm();

            // Check for duplicate error
            await expect(
                signersPage.formModal.getByText(/já cadastrado|already registered/i)
            ).toBeVisible();
        });
    });

    /**
     * =========================================================================
     * ERROR HANDLING
     * =========================================================================
     */
    test.describe('Error Handling', () => {
        test('should handle API error when creating signer', async ({ page }) => {
            // Mock API error
            await page.route('**/api/signers', (route) => {
                route.fulfill({
                    status: 500,
                    contentType: 'application/json',
                    body: JSON.stringify({ error: 'Internal Server Error' }),
                });
            });

            await signersPage.goto();
            await signersPage.clickNewSigner();

            await signersPage.fillSignerForm({
                fullName: 'Error Test User',
                email: generateTestEmail('error'),
                phone: '+5511999999999',
                documentType: 'cpf',
                documentNumber: VALID_CPFS[0],
            });

            await signersPage.submitForm();

            // Verify error message displayed
            await signersPage.assertError('erro ao criar|failed to create');
        });

        test('should handle network timeout gracefully', async ({ page }) => {
            // Mock timeout
            await page.route('**/api/signers', (route) => {
                // Never respond
            });

            await signersPage.goto();
            await signersPage.clickNewSigner();

            await signersPage.fillSignerForm({
                fullName: 'Timeout Test User',
                email: generateTestEmail('timeout'),
                phone: '+5511999999999',
                documentType: 'cpf',
                documentNumber: VALID_CPFS[0],
            });

            // Submit should timeout and show error
            await signersPage.submitForm();

            await expect(
                page.getByText(/tempo esgotado|timeout|erro de conexão/i)
            ).toBeVisible({ timeout: 35000 });
        });
    });

    /**
     * =========================================================================
     * EDIT AND DELETE
     * =========================================================================
     */
    test.describe('Edit and Delete', () => {
        test('should edit existing signer', async ({ page }) => {
            await signersPage.goto();

            const email = generateTestEmail('edit');

            // Create signer
            await signersPage.createSigner({
                fullName: 'Original Name',
                email,
                phone: '+5511999999999',
                documentType: 'cpf',
                documentNumber: VALID_CPFS[0],
            });

            // Edit signer
            await signersPage.clickEditSigner(email);

            // Update name
            await signersPage.fullNameInput.fill('Updated Name');
            await signersPage.submitForm();

            // Verify update
            await expect(page.getByText('atualizado com sucesso')).toBeVisible();
            await expect(page.getByText('Updated Name')).toBeVisible();
        });

        test('should delete signer with confirmation', async ({ page }) => {
            await signersPage.goto();

            const email = generateTestEmail('delete');

            // Create signer
            await signersPage.createSigner({
                fullName: 'Delete Me',
                email,
                phone: '+5511999999999',
                documentType: 'cpf',
                documentNumber: VALID_CPFS[0],
            });

            // Delete signer
            await signersPage.clickDeleteSigner(email);

            // Verify deleted
            await signersPage.assertSignerNotVisible(email);
        });

        test('should cancel delete operation', async ({ page }) => {
            await signersPage.goto();

            const email = generateTestEmail('cancel');

            // Create signer
            await signersPage.createSigner({
                fullName: 'Cancel Delete',
                email,
                phone: '+5511999999999',
                documentType: 'cpf',
                documentNumber: VALID_CPFS[0],
            });

            // Click delete but cancel confirmation
            const card = signersPage.signersTable.getByText(email);
            await card.getByRole('button', { name: /excluir|delete/i }).click();
            await page.getByRole('button', { name: /cancelar|cancel/i }).click();

            // Verify signer still exists
            await signersPage.assertSignerVisible(email);
        });
    });

    /**
     * =========================================================================
     * ACCESSIBILITY
     * =========================================================================
     */
    test.describe('Accessibility', () => {
        test('should be keyboard navigable', async ({ page }) => {
            await signersPage.goto();

            // Tab through interactive elements
            await page.keyboard.press('Tab');
            await expect(signersPage.newSignerButton).toBeFocused();

            await page.keyboard.press('Tab');
            await expect(signersPage.searchInput).toBeFocused();

            // Enter to create new signer
            await page.keyboard.press('Enter');
            await signersPage.assertUploadModalVisible();
        });

        test('should have proper ARIA labels', async ({ page }) => {
            await signersPage.goto();

            // Check form labels
            await signersPage.clickNewSigner();

            await expect(signersPage.fullNameInput).toHaveAttribute('aria-label', /nome/i);
            await expect(signersPage.emailInput).toHaveAttribute('aria-label', /e-mail/i);
        });
    });
});
