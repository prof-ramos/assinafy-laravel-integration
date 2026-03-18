import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';
import { AssignmentMethod } from './DocumentsPage';

/**
 * Signature Flow Page Object
 *
 * Handles the complete signature workflow including:
 * - Signer email reception
 * - Signature link access
 * - Authentication for signing
 * - Signature placement
 * - Completion confirmation
 */
export class SignatureFlowPage extends BasePage {
    // ============================================================================
    // Locators - Email/Landing Page
    // ============================================================================
    readonly heading: Locator;
    readonly documentPreview: Locator;
    readonly signerInfo: Locator;
    readonly startSignatureButton: Locator;
    readonly declineButton: Locator;

    // ============================================================================
    // Locators - Authentication
    // ============================================================================
    readonly authModal: Locator;
    readonly emailInput: Locator;
    readonly codeInput: Locator;
    readonly sendCodeButton: Locator;
    readonly verifyCodeButton: Locator;
    readonly resendCodeLink: Locator;

    // ============================================================================
    // Locators - Signature Canvas
    // ============================================================================
    readonly signatureCanvas: Locator;
    readonly signaturePad: Locator;
    readonly clearSignatureButton: Locator;
    readonly acceptTermsCheckbox: Locator;
    readonly confirmSignatureButton: Locator;

    // ============================================================================
    // Locators - Collect Method (Positioned Fields)
    // ============================================================================
    readonly fieldMarkers: Locator;
    readonly currentFieldHighlight: Locator;
    readonly nextFieldButton: Locator;
    readonly textFieldInput: Locator;
    readonly dateFieldInput: Locator;

    // ============================================================================
    // Locators - Completion
    // ============================================================================
    readonly successMessage: Locator;
    readonly documentDownloadLink: Locator;
    readonly closeButton: Locator;

    // ============================================================================
    // Locators - Decline Flow
    // ============================================================================
    readonly declineModal: Locator;
    readonly declineReasonSelect: Locator;
    readonly declineReasonText: Locator;
    readonly confirmDeclineButton: Locator;

    // ============================================================================
    // Constructor
    // ============================================================================
    constructor(page: Page) {
        super(page);

        // Email/Landing page
        this.heading = this.page.getByRole('heading', {
            name: /assinatura eletrônica|electronic signature|documento para assinar/i
        });
        this.documentPreview = this.page.getByTestId('document-preview');
        this.signerInfo = this.page.getByTestId('signer-info');
        this.startSignatureButton = this.page.getByRole('button', {
            name: /iniciar assinatura|start signing|assinar agora/i
        });
        this.declineButton = this.page.getByRole('button', {
            name: /recusar|decline|não posso assinar/i
        });

        // Authentication
        this.authModal = this.page.getByRole('dialog', { name: /autenticação|authentication/i });
        this.emailInput = this.authModal.getByLabel(/e-mail|email/i);
        this.codeInput = this.authModal.getByLabel(/código|code|token/i);
        this.sendCodeButton = this.authModal.getByRole('button', { name: /enviar código|send code/i });
        this.verifyCodeButton = this.authModal.getByRole('button', { name: /verificar|verify|confirmar/i });
        this.resendCodeLink = this.authModal.getByRole('link', { name: /reenviar|resend/i });

        // Signature canvas
        this.signatureCanvas = this.page.getByTestId('signature-canvas');
        this.signaturePad = this.page.getByTestId('signature-pad');
        this.clearSignatureButton = this.page.getByRole('button', { name: /limpar|clear/i });
        this.acceptTermsCheckbox = this.page.getByLabel(/aceito|concordo|agree|accept/i);
        this.confirmSignatureButton = this.page.getByRole('button', {
            name: /confirmar assinatura|confirm signature|assinar/i
        });

        // Collect method fields
        this.fieldMarkers = this.page.getByTestId(/field-marker-/);
        this.currentFieldHighlight = this.page.getByTestId('current-field');
        this.nextFieldButton = this.page.getByRole('button', { name: /próximo|next/i });
        this.textFieldInput = this.page.getByLabel(/texto|text/i);
        this.dateFieldInput = this.page.getByLabel(/data|date/i);

        // Completion
        this.successMessage = this.page.getByTestId('success-message');
        this.documentDownloadLink = this.page.getByRole('link', { name: /baixar documento|download/i });
        this.closeButton = this.page.getByRole('button', { name: /fechar|close/i });

        // Decline flow
        this.declineModal = this.page.getByRole('dialog', { name: /recusar|decline/i });
        this.declineReasonSelect = this.declineModal.getByLabel(/motivo|reason/i);
        this.declineReasonText = this.declineModal.getByLabel(/descreva|explain/);
        this.confirmDeclineButton = this.declineModal.getByRole('button', { name: /confirmar|confirm/i });
    }

    // ============================================================================
    // Navigation
    // ============================================================================

    /**
     * Navigate to signature link directly
     */
    async goto(signatureToken: string): Promise<void> {
        await this.page.goto(`/sign/${signatureToken}`);
        await this.waitForPageReady();
    }

    /**
     * Navigate from email link simulation
     */
    async gotoFromEmailLink(signatureLink: string): Promise<void> {
        await this.page.goto(signatureLink);
        await this.waitForPageReady();
    }

    // ============================================================================
    // Landing Page Actions
    // ============================================================================

    /**
     * Start the signature process
     */
    async startSignature(): Promise<void> {
        await this.startSignatureButton.click();
        // May trigger authentication modal
    }

    /**
     * Click decline button
     */
    async clickDecline(): Promise<void> {
        await this.declineButton.click();
        await this.declineModal.waitFor({ state: 'visible' });
    }

    /**
     * Get signer information from page
     */
    async getSignerInfo(): Promise<{ name: string; email: string }> {
        const name = await this.signerInfo.getByTestId('signer-name').textContent();
        const email = await this.signerInfo.getByTestId('signer-email').textContent();
        return {
            name: name?.trim() || '',
            email: email?.trim() || '',
        };
    }

    /**
     * Get document information from page
     */
    async getDocumentInfo(): Promise<{ title: string; method: string }> {
        const title = await this.documentPreview.getByTestId('document-title').textContent();
        const method = await this.documentPreview.getByTestId('assignment-method').textContent();
        return {
            title: title?.trim() || '',
            method: method?.trim() || '',
        };
    }

    // ============================================================================
    // Authentication Actions
    // ============================================================================

    /**
     * Submit email to receive verification code
     */
    async submitEmailForCode(email: string): Promise<void> {
        if (await this.authModal.isVisible()) {
            await this.emailInput.fill(email);
            await this.sendCodeButton.click();
            await expect(this.page.getByText(/código enviado|code sent/i)).toBeVisible();
        }
    }

    /**
     * Enter verification code
     */
    async enterVerificationCode(code: string): Promise<void> {
        await this.codeInput.fill(code);
        await this.verifyCodeButton.click();
        // Wait for authentication to complete
        await this.page.waitForURL(/\/sign\/.*\/verify/);
    }

    /**
     * Complete authentication flow
     */
    async authenticate(email: string, code: string): Promise<void> {
        await this.submitEmailForCode(email);
        await this.enterVerificationCode(code);
    }

    /**
     * Request new verification code
     */
    async resendCode(): Promise<void> {
        await this.resendCodeLink.click();
        await expect(this.page.getByText(/novo código enviado|new code sent/i)).toBeVisible();
    }

    // ============================================================================
    // Virtual Signature Actions
    // ============================================================================

    /**
     * Draw signature on canvas (simulated)
     */
    async drawSignature(signaturePath?: number[][]): Promise<void> {
        await this.signaturePad.waitFor({ state: 'visible' });

        // Simulate signature drawing
        const canvas = await this.signatureCanvas.boundingBox();
        if (canvas) {
            const path = signaturePath || [
                [canvas.x + 20, canvas.y + canvas.height / 2],
                [canvas.x + 50, canvas.y + canvas.height / 2 - 20],
                [canvas.x + 80, canvas.y + canvas.height / 2],
                [canvas.x + 110, canvas.y + canvas.height / 2 + 10],
            ];

            await this.page.mouse.move(path[0][0], path[0][1]);
            await this.page.mouse.down();
            for (const point of path.slice(1)) {
                await this.page.mouse.move(point[0], point[1]);
            }
            await this.page.mouse.up();
        }
    }

    /**
     * Clear signature from canvas
     */
    async clearSignature(): Promise<void> {
        await this.clearSignatureButton.click();
    }

    /**
     * Accept terms and conditions
     */
    async acceptTerms(): Promise<void> {
        const isChecked = await this.acceptTermsCheckbox.isChecked();
        if (!isChecked) {
            await this.acceptTermsCheckbox.click();
        }
    }

    /**
     * Confirm signature submission
     */
    async confirmSignature(): Promise<void> {
        await this.confirmSignatureButton.click();
        await this.waitForApiRequest('/api/signatures');
    }

    /**
     * Complete virtual signature flow
     */
    async signVirtually(signaturePath?: number[][]): Promise<void> {
        await this.drawSignature(signaturePath);
        await this.acceptTerms();
        await this.confirmSignature();
        await this.assertSignatureCompleted();
    }

    // ============================================================================
    // Collect Signature Actions
    // ============================================================================

    /**
     * Get count of signature fields to fill
     */
    async getFieldCount(): Promise<number> {
        return await this.fieldMarkers.count();
    }

    /**
     * Fill a text field
     */
    async fillTextField(value: string): Promise<void> {
        await this.textFieldInput.fill(value);
        await this.nextFieldButton.click();
    }

    /**
     * Fill a date field
     */
    async fillDateField(date: Date): Promise<void> {
        const formatted = date.toISOString().split('T')[0];
        await this.dateFieldInput.fill(formatted);
        await this.nextFieldButton.click();
    }

    /**
     * Sign at current field position
     */
    async signAtCurrentField(): Promise<void> {
        const field = await this.currentFieldHighlight.boundingBox();
        if (field) {
            await this.page.mouse.move(field.x + field.width / 2, field.y + field.height / 2);
            await this.page.mouse.down();
            await this.page.mouse.move(field.x + field.width / 2 + 50, field.y + field.height / 2);
            await this.page.mouse.up();
        }
        await this.nextFieldButton.click();
    }

    /**
     * Complete collect signature flow
     */
    async signCollect(textFields?: Record<string, string>, dates?: Record<string, Date>): Promise<void> {
        const fieldCount = await this.getFieldCount();

        for (let i = 0; i < fieldCount; i++) {
            const fieldType = await this.page.getByTestId(`field-${i}`).getAttribute('data-field-type');

            if (fieldType === 'text' && textFields) {
                await this.fillTextField(Object.values(textFields)[i] || '');
            } else if (fieldType === 'date' && dates) {
                await this.fillDateField(Object.values(dates)[i] || new Date());
            } else if (fieldType === 'signature') {
                await this.signAtCurrentField();
            }
        }

        await this.acceptTerms();
        await this.confirmSignatureButton.click();
        await this.assertSignatureCompleted();
    }

    // ============================================================================
    // Decline Actions
    // ============================================================================

    /**
     * Decline to sign document
     */
    async declineDocument(reason: string, details?: string): Promise<void> {
        await this.clickDecline();
        await this.declineReasonSelect.selectOption(reason);
        if (details) {
            await this.declineReasonText.fill(details);
        }
        await this.confirmDeclineButton.click();
        await this.waitForApiRequest('/api/signatures/decline');
    }

    // ============================================================================
    // Completion Actions
    // ============================================================================

    /**
     * Download signed document
     */
    async downloadDocument(): Promise<void> {
        const downloadPromise = this.page.waitForEvent('download');
        await this.documentDownloadLink.click();
        const download = await downloadPromise;
        expect(download.suggestedFilename()).toMatch(/\.pdf$/);
    }

    /**
     * Close signature completion view
     */
    async close(): Promise<void> {
        await this.closeButton.click();
    }

    // ============================================================================
    // Assertions
    // ============================================================================

    /**
     * Assert signature landing page is loaded
     */
    async assertIsLoaded(): Promise<void> {
        await expect(this.heading).toBeVisible();
        await expect(this.documentPreview).toBeVisible();
    }

    /**
     * Assert authentication modal is visible
     */
    async assertAuthRequired(): Promise<void> {
        await expect(this.authModal).toBeVisible();
    }

    /**
     * Assert signature canvas is visible
     */
    async assertSignatureCanvasVisible(): Promise<void> {
        await expect(this.signatureCanvas).toBeVisible();
    }

    /**
     * Assert signature is completed successfully
     */
    async assertSignatureCompleted(): Promise<void> {
        await expect(this.successMessage).toBeVisible();
        await expect(this.successMessage).toContainText(/assinatura realizada|signature completed|sucesso/i);
    }

    /**
     * Assert signature was declined
     */
    async assertSignatureDeclined(): Promise<void> {
        await expect(this.page.getByText(/recusado|declined/i)).toBeVisible();
    }

    /**
     * Assert document has specific assignment method
     */
    async assertAssignmentMethod(method: AssignmentMethod): Promise<void> {
        const docInfo = await this.getDocumentInfo();
        expect(docInfo.method.toLowerCase()).toContain(method);
    }

    /**
     * Assert specific field count for collect method
     */
    async assertFieldCount(count: number): Promise<void> {
        await expect.poll(async () => await this.getFieldCount()).toBe(count);
    }

    /**
     * Assert field is highlighted for signing
     */
    async assertFieldHighlighted(fieldIndex: number): Promise<void> {
        const field = this.page.getByTestId(`field-${fieldIndex}`);
        await expect(field).toHaveAttribute('data-highlighted', 'true');
    }

    /**
     * Assert terms checkbox is visible
     */
    async assertTermsVisible(): Promise<void> {
        await expect(this.acceptTermsCheckbox).toBeVisible();
    }

    /**
     * Assert terms checkbox is checked
     */
    async assertTermsAccepted(): Promise<void> {
        await expect(this.acceptTermsCheckbox).toBeChecked();
    }
}
