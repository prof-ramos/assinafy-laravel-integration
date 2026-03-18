import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Signer Form Data Interface
 */
export interface SignerFormData {
    fullName: string;
    email: string;
    phone?: string;
    documentType: 'cpf' | 'cnpj' | 'passport';
    documentNumber: string;
}

/**
 * Signers List Page Object
 *
 * Page for managing signers - list, create, edit, delete.
 */
export class SignersPage extends BasePage {
    // ============================================================================
    // Locators - List View
    // ============================================================================
    readonly heading: Locator;
    readonly newSignerButton: Locator;
    readonly searchInput: Locator;
    readonly clearSearchButton: Locator;
    readonly signersTable: Locator;
    readonly signersTableRows: Locator;

    // ============================================================================
    // Locators - Form Modal
    // ============================================================================
    readonly formModal: Locator;
    readonly formHeading: Locator;
    readonly fullNameInput: Locator;
    readonly emailInput: Locator;
    readonly phoneInput: Locator;
    readonly documentTypeSelect: Locator;
    readonly documentNumberInput: Locator;
    readonly submitButton: Locator;
    readonly cancelButton: Locator;
    readonly closeButton: Locator;

    // ============================================================================
    // Locators - Validation Messages
    // ============================================================================
    readonly fullNameError: Locator;
    readonly emailError: Locator;
    readonly documentTypeError: Locator;
    readonly documentNumberError: Locator;

    // ============================================================================
    // Locators - Signer Card (in list)
    // ============================================================================
    readonly signerCardTemplate: Locator;

    // ============================================================================
    // Constructor
    // ============================================================================
    constructor(page: Page) {
        super(page);

        // List view
        this.heading = this.page.getByRole('heading', { name: /signatários|signers/i });
        this.newSignerButton = this.page.getByRole('button', {
            name: /novo signatário|adicionar signatário|criar signatário/i
        });
        this.searchInput = this.page.getByPlaceholder(/buscar|pesquisar|search/i);
        this.clearSearchButton = this.page.getByRole('button', { name: /limpar|clear/i });
        this.signersTable = this.page.getByTestId('signers-table');
        this.signersTableRows = this.signersTable.getByRole('row');

        // Form modal
        this.formModal = this.page.getByRole('dialog', { name: /signatário|signer/i });
        this.formHeading = this.formModal.getByRole('heading');
        this.fullNameInput = this.formModal.getByLabel(/nome completo|full name/i);
        this.emailInput = this.formModal.getByLabel(/e-mail|email/i);
        this.phoneInput = this.formModal.getByLabel(/telefone|phone|whatsapp/i);
        this.documentTypeSelect = this.formModal.getByLabel(/tipo de documento|document type/i);
        this.documentNumberInput = this.formModal.getByLabel(/número do documento|document number/i);
        this.submitButton = this.formModal.getByRole('button', { name: /salvar|criar|save/i });
        this.cancelButton = this.formModal.getByRole('button', { name: /cancelar|cancel/i });
        this.closeButton = this.formModal.getByRole('button', { name: /fechar|close/i });

        // Validation messages
        this.fullNameError = this.formModal.getByTestId('error-full-name');
        this.emailError = this.formModal.getByTestId('error-email');
        this.documentTypeError = this.formModal.getByTestId('error-document-type');
        this.documentNumberError = this.formModal.getByTestId('error-document-number');

        // Signer card template
        this.signerCardTemplate = this.page.getByTestId(/signer-card-/);
    }

    // ============================================================================
    // Navigation
    // ============================================================================

    /**
     * Navigate to signers page
     */
    async goto(): Promise<void> {
        await this.page.goto('/signers');
        await this.waitForPageReady();
    }

    // ============================================================================
    // List Actions
    // ============================================================================

    /**
     * Click new signer button to open form
     */
    async clickNewSigner(): Promise<void> {
        await this.newSignerButton.click();
        await this.formModal.waitFor({ state: 'visible' });
    }

    /**
     * Search for a signer by email or name
     */
    async search(query: string): Promise<void> {
        await this.searchInput.fill(query);
        // Wait for debounced search
        await this.page.waitForTimeout(500);
        await this.waitForApiRequest('/api/signers');
    }

    /**
     * Clear search and show all signers
     */
    async clearSearch(): Promise<void> {
        await this.clearSearchButton.click();
        await this.page.waitForTimeout(500);
    }

    /**
     * Get count of visible signers
     */
    async getVisibleSignerCount(): Promise<number> {
        return await this.signersTableRows.count();
    }

    /**
     * Get all visible signer emails
     */
    async getVisibleSignerEmails(): Promise<string[]> {
        const emails: string[] = [];
        const rows = await this.signersTableRows.all();
        for (const row of rows) {
            const email = await row.getByTestId(/signer-email/).textContent();
            if (email) emails.push(email.trim());
        }
        return emails;
    }

    /**
     * Click on a signer by email
     */
    async clickSigner(email: string): Promise<void> {
        await this.signersTable.getByText(email).click();
    }

    /**
     * Click edit button for a signer
     */
    async clickEditSigner(email: string): Promise<void> {
        const row = this.signersTable.getByText(email);
        await row.getByRole('button', { name: /editar|edit/i }).click();
    }

    /**
     * Click delete button for a signer
     */
    async clickDeleteSigner(email: string): Promise<void> {
        const row = this.signersTable.getByText(email);
        await row.getByRole('button', { name: /excluir|delete/i }).click();
        // Confirm deletion
        await this.page.getByRole('button', { name: /confirmar|confirm/i }).click();
    }

    // ============================================================================
    // Form Actions
    // ============================================================================

    /**
     * Fill the signer form
     */
    async fillSignerForm(data: SignerFormData): Promise<void> {
        await this.fullNameInput.fill(data.fullName);
        await this.emailInput.fill(data.email);
        if (data.phone) {
            await this.phoneInput.fill(data.phone);
        }
        await this.documentTypeSelect.selectOption(data.documentType);
        await this.documentNumberInput.fill(data.documentNumber);
    }

    /**
     * Submit the signer form
     */
    async submitForm(): Promise<void> {
        await this.submitButton.click();
        await this.waitForApiRequest('/api/signers');
    }

    /**
     * Cancel the signer form
     */
    async cancelForm(): Promise<void> {
        await this.cancelButton.click();
        await this.formModal.waitFor({ state: 'hidden' });
    }

    /**
     * Close the modal
     */
    async closeModal(): Promise<void> {
        await this.closeButton.click();
        await this.formModal.waitFor({ state: 'hidden' });
    }

    // ============================================================================
    // Form Shortcuts
    // ============================================================================

    /**
     * Create a new signer (opens form, fills, submits, waits for success)
     */
    async createSigner(data: SignerFormData): Promise<void> {
        await this.clickNewSigner();
        await this.fillSignerForm(data);
        await this.submitForm();
        await this.assertSuccess('signatário criado|signer created|criado com sucesso');
        await this.formModal.waitFor({ state: 'hidden' });
    }

    // ============================================================================
    // Assertions
    // ============================================================================

    /**
     * Assert page is loaded
     */
    async assertIsLoaded(): Promise<void> {
        await expect(this.heading).toBeVisible();
        await expect(this.signersTable).toBeVisible();
    }

    /**
     * Assert signer is visible in list
     */
    async assertSignerVisible(email: string): Promise<void> {
        await expect(this.signersTable.getByText(email)).toBeVisible();
    }

    /**
     * Assert signer is not visible in list
     */
    async assertSignerNotVisible(email: string): Promise<void> {
        await expect(this.signersTable.getByText(email)).not.toBeVisible();
    }

    /**
     * Assert specific error message is shown
     */
    async assertFieldError(field: 'fullName' | 'email' | 'documentType' | 'documentNumber', message: string): Promise<void> {
        const errorLocator = {
            fullName: this.fullNameError,
            email: this.emailError,
            documentType: this.documentTypeError,
            documentNumber: this.documentNumberError,
        }[field];

        await expect(errorLocator).toContainText(message);
    }

    /**
     * Assert validation error is shown
     */
    async assertValidationError(): Promise<void> {
        await expect(this.formModal.getByText(/required|obrigatório/i)).toBeVisible();
    }

    /**
     * Assert search results contain expected count
     */
    async assertSearchResultCount(count: number): Promise<void> {
        await expect.poll(async () => await this.getVisibleSignerCount()).toBe(count);
    }

    /**
     * Assert signers are ordered alphabetically by name
     */
    async assertSignersOrderedAlphabetically(): Promise<void> {
        const emails = await this.getVisibleSignerEmails();
        const sorted = [...emails].sort();
        expect(emails).toEqual(sorted);
    }
}
