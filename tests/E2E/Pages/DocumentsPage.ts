import { Page, Locator, expect, Frame } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Document Status Enum
 */
export enum DocumentStatus {
    UPLOADING = 'uploading',
    UPLOADED = 'uploaded',
    METADATA_PROCESSING = 'metadata_processing',
    METADATA_READY = 'metadata_ready',
    PENDING_SIGNATURE = 'pending_signature',
    CERTIFICATING = 'certificating',
    CERTIFICATED = 'certificated',
    REJECTED_BY_SIGNER = 'rejected_by_signer',
    REJECTED_BY_USER = 'rejected_by_user',
    FAILED = 'failed',
    EXPIRED = 'expired',
}

/**
 * Assignment Method Enum
 */
export enum AssignmentMethod {
    VIRTUAL = 'virtual',
    COLLECT = 'collect',
}

/**
 * Document Form Data Interface
 */
export interface DocumentFormData {
    title: string;
    description?: string;
    processoId?: string;
    oficioId?: string;
}

/**
 * Document Filter Options
 */
export interface DocumentFilters {
    status?: DocumentStatus;
    method?: AssignmentMethod;
    search?: string;
    dateFrom?: Date;
    dateTo?: Date;
}

/**
 * Signature Field Position
 */
export interface SignatureField {
    type: 'signature' | 'initials' | 'text' | 'date';
    page: number;
    x: number;
    y: number;
    width?: number;
    height?: number;
    signerEmail?: string;
}

/**
 * Assignment Data Interface
 */
export interface AssignmentData {
    method: AssignmentMethod;
    signerEmails: string[];
    message?: string;
    deadlineDays?: number;
    fields?: SignatureField[];
    signInOrder?: boolean;
}

/**
 * Documents Page Object
 *
 * Main page for document management - list, upload, create signature assignments.
 */
export class DocumentsPage extends BasePage {
    // ============================================================================
    // Locators - List View
    // ============================================================================
    readonly heading: Locator;
    readonly uploadButton: Locator;
    readonly filtersButton: Locator;
    readonly searchInput: Locator;
    readonly documentsGrid: Locator;
    readonly documentsList: Locator;
    readonly emptyState: Locator;

    // ============================================================================
    // Locators - Document Card
    // ============================================================================
    readonly documentCardTemplate: Locator;

    // ============================================================================
    // Locators - Upload Modal
    // ============================================================================
    readonly uploadModal: Locator;
    readonly uploadHeading: Locator;
    readonly titleInput: Locator;
    readonly descriptionInput: Locator;
    readonly processoIdInput: Locator;
    readonly oficioIdInput: Locator;
    readonly fileInput: Locator;
    readonly fileDropZone: Locator;
    readonly uploadSubmitButton: Locator;
    readonly uploadCancelButton: Locator;
    readonly uploadProgressBar: Locator;
    readonly uploadFileName: Locator;

    // ============================================================================
    // Locators - Filters Panel
    // ============================================================================
    readonly filtersPanel: Locator;
    readonly statusFilter: Locator;
    readonly methodFilter: Locator;
    readonly dateFromFilter: Locator;
    readonly dateToFilter: Locator;
    readonly clearFiltersButton: Locator;
    readonly applyFiltersButton: Locator;

    // ============================================================================
    // Locators - Signature Assignment Modal
    // ============================================================================
    readonly signatureModal: Locator;
    readonly signatureHeading: Locator;
    readonly virtualMethodRadio: Locator;
    readonly collectMethodRadio: Locator;
    readonly signerInput: Locator;
    readonly addSignerButton: Locator;
    readonly signersList: Locator;
    readonly messageInput: Locator;
    readonly deadlineInput: Locator;
    readonly signOrderCheckbox: Locator;
    readonly previewCanvas: Locator;
    readonly addFieldButton: Locator;
    readonly createAssignmentButton: Locator;

    // ============================================================================
    // Locators - Document Detail View
    // ============================================================================
    readonly detailView: Locator;
    readonly detailTitle: Locator;
    readonly detailStatus: Locator;
    readonly detailMethod: Locator;
    readonly detailCreatedAt: Locator;
    readonly detailSignersList: Locator;
    readonly downloadOriginalButton: Locator;
    readonly downloadCertificatedButton: Locator;
    readonly downloadCertificatePageButton: Locator;
    readonly downloadBundleButton: Locator;
    readonly backButton: Locator;

    // ============================================================================
    // Constructor
    // ============================================================================
    constructor(page: Page) {
        super(page);

        // List view
        this.heading = this.page.getByRole('heading', { name: /documentos|documents/i });
        this.uploadButton = this.page.getByRole('button', {
            name: /novo documento|upload|criar documento/i
        });
        this.filtersButton = this.page.getByRole('button', { name: /filtros|filters/i });
        this.searchInput = this.page.getByPlaceholder(/buscar|pesquisar|search/i);
        this.documentsGrid = this.page.getByTestId('documents-grid');
        this.documentsList = this.page.getByTestId('documents-list');
        this.emptyState = this.page.getByTestId('empty-state');

        // Document card template
        this.documentCardTemplate = this.page.getByTestId(/document-card-/);

        // Upload modal
        this.uploadModal = this.page.getByRole('dialog', { name: /upload documento|enviar arquivo/i });
        this.uploadHeading = this.uploadModal.getByRole('heading');
        this.titleInput = this.uploadModal.getByLabel(/título|title/i);
        this.descriptionInput = this.uploadModal.getByLabel(/descrição|description/i);
        this.processoIdInput = this.uploadModal.getByLabel(/processo|process id/i);
        this.oficioIdInput = this.uploadModal.getByLabel(/ofício|ofício id/i);
        this.fileInput = this.uploadModal.getByLabel(/arquivo|file/i);
        this.fileDropZone = this.uploadModal.getByTestId('file-drop-zone');
        this.uploadSubmitButton = this.uploadModal.getByRole('button', { name: /enviar|upload|salvar/i });
        this.uploadCancelButton = this.uploadModal.getByRole('button', { name: /cancelar|cancel/i });
        this.uploadProgressBar = this.uploadModal.getByRole('progressbar');
        this.uploadFileName = this.uploadModal.getByTestId('file-name');

        // Filters panel
        this.filtersPanel = this.page.getByTestId('filters-panel');
        this.statusFilter = this.page.getByLabel(/status/i);
        this.methodFilter = this.page.getByLabel(/método|method/i);
        this.dateFromFilter = this.page.getByLabel(/data inicial|from/i);
        this.dateToFilter = this.page.getByLabel(/data final|to/i);
        this.clearFiltersButton = this.page.getByRole('button', { name: /limpar filtros|clear/i });
        this.applyFiltersButton = this.page.getByRole('button', { name: /aplicar|apply/i });

        // Signature assignment modal
        this.signatureModal = this.page.getByRole('dialog', { name: /solicitar assinatura|signature assignment/i });
        this.signatureHeading = this.signatureModal.getByRole('heading');
        this.virtualMethodRadio = this.signatureModal.getByRole('radio', { name: /virtual|interno/i });
        this.collectMethodRadio = this.signatureModal.getByRole('radio', { name: /collect|posicionado/i });
        this.signerInput = this.signatureModal.getByPlaceholder(/e-mail do signatário/i);
        this.addSignerButton = this.signatureModal.getByRole('button', { name: /adicionar|add/i });
        this.signersList = this.signatureModal.getByTestId('signers-list');
        this.messageInput = this.signatureModal.getByLabel(/mensagem|message/i);
        this.deadlineInput = this.signatureModal.getByLabel(/prazo|deadline/i);
        this.signOrderCheckbox = this.signatureModal.getByLabel(/ordem de assinatura|sign order/i);
        this.previewCanvas = this.signatureModal.getByTestId('pdf-preview');
        this.addFieldButton = this.signatureModal.getByRole('button', { name: /adicionar campo|add field/i });
        this.createAssignmentButton = this.signatureModal.getByRole('button', {
            name: /criar solicitação|create assignment/i
        });

        // Document detail view
        this.detailView = this.page.getByTestId('document-detail');
        this.detailTitle = this.detailView.getByTestId('document-title');
        this.detailStatus = this.detailView.getByTestId('document-status');
        this.detailMethod = this.detailView.getByTestId('document-method');
        this.detailCreatedAt = this.detailView.getByTestId('created-at');
        this.detailSignersList = this.detailView.getByTestId('signers-list');
        this.downloadOriginalButton = this.detailView.getByRole('link', { name: /original/i });
        this.downloadCertificatedButton = this.detailView.getByRole('link', { name: /certificado|certificated/i });
        this.downloadCertificatePageButton = this.detailView.getByRole('link', { name: /página de certificado/i });
        this.downloadBundleButton = this.detailView.getByRole('link', { name: /bundle/i });
        this.backButton = this.detailView.getByRole('button', { name: /voltar|back/i });
    }

    // ============================================================================
    // Navigation
    // ============================================================================

    /**
     * Navigate to documents page
     */
    async goto(): Promise<void> {
        await this.page.goto('/documents');
        await this.waitForPageReady();
    }

    /**
     * Navigate to specific document detail
     */
    async gotoDocument(id: string): Promise<void> {
        await this.page.goto(`/documents/${id}`);
        await this.waitForPageReady();
    }

    // ============================================================================
    // List Actions
    // ============================================================================

    /**
     * Get count of visible documents
     */
    async getVisibleDocumentCount(): Promise<number> {
        const gridCount = await this.documentsGrid.getByTestId(/document-card-/).count();
        const listCount = await this.documentsList.getByRole('row').count();
        return Math.max(gridCount, listCount) - 1; // Exclude header row
    }

    /**
     * Get all visible document titles
     */
    async getDocumentTitles(): Promise<string[]> {
        const titles: string[] = [];
        const cards = await this.documentsGrid.getByTestId(/document-card-/).all();
        for (const card of cards) {
            const title = await card.getByTestId('document-title').textContent();
            if (title) titles.push(title.trim());
        }
        return titles;
    }

    /**
     * Click on a document by title
     */
    async clickDocument(title: string): Promise<void> {
        await this.documentsGrid.getByRole('link', { name: title }).click();
    }

    /**
     * Click "Create Signature" for a document
     */
    async clickCreateSignature(documentTitle: string): Promise<void> {
        const card = this.documentsGrid.getByText(documentTitle);
        await card.getByRole('button', { name: /solicitar assinatura|create signature/i }).click();
    }

    /**
     * Click "Create Signature" by document ID
     */
    async clickCreateSignatureById(documentId: string): Promise<void> {
        await this.page.getByTestId(`create-signature-${documentId}`).click();
    }

    /**
     * Search documents
     */
    async search(query: string): Promise<void> {
        await this.searchInput.fill(query);
        await this.page.waitForTimeout(500);
        await this.waitForApiRequest('/api/documents');
    }

    // ============================================================================
    // Upload Actions
    // ============================================================================

    /**
     * Click upload button to open modal
     */
    async clickUpload(): Promise<void> {
        await this.uploadButton.click();
        await this.uploadModal.waitFor({ state: 'visible' });
    }

    /**
     * Fill document form
     */
    async fillDocumentForm(data: DocumentFormData): Promise<void> {
        await this.titleInput.fill(data.title);
        if (data.description) {
            await this.descriptionInput.fill(data.description);
        }
        if (data.processoId) {
            await this.processoIdInput.fill(data.processoId);
        }
        if (data.oficioId) {
            await this.oficioIdInput.fill(data.oficioId);
        }
    }

    /**
     * Upload PDF file
     */
    async uploadPdf(filePath: string): Promise<void> {
        await this.fileInput.setInputFiles(filePath);
        await expect(this.uploadFileName).toBeVisible();
    }

    /**
     * Upload PDF from base64 content
     */
    async uploadPdfFromBase64(base64Content: string, filename: string = 'document.pdf'): Promise<void> {
        const buffer = Buffer.from(base64Content, 'base64');
        await this.fileInput.setInputFiles({
            name: filename,
            mimeType: 'application/pdf',
            buffer: buffer,
        });
    }

    /**
     * Submit upload form
     */
    async submitUpload(): Promise<void> {
        await this.uploadSubmitButton.click();

        // Wait for progress bar to complete
        await this.uploadProgressBar.waitFor({ state: 'visible' }).catch(() => {});
        await this.uploadProgressBar.waitFor({ state: 'detached' }).catch(() => {});

        // Wait for API call
        await this.waitForApiRequest('/api/documents');
    }

    /**
     * Complete upload flow (open modal, fill, upload file, submit)
     */
    async uploadDocument(data: DocumentFormData, pdfPath: string): Promise<void> {
        await this.clickUpload();
        await this.fillDocumentForm(data);
        await this.uploadPdf(pdfPath);
        await this.submitUpload();
    }

    /**
     * Cancel upload modal
     */
    async cancelUpload(): Promise<void> {
        await this.uploadCancelButton.click();
        await this.uploadModal.waitFor({ state: 'hidden' });
    }

    // ============================================================================
    // Filter Actions
    // ============================================================================

    /**
     * Open filters panel
     */
    async openFilters(): Promise<void> {
        await this.filtersButton.click();
        await this.filtersPanel.waitFor({ state: 'visible' });
    }

    /**
     * Filter by status
     */
    async filterByStatus(status: DocumentStatus): Promise<void> {
        await this.openFilters();
        await this.statusFilter.selectOption(status);
        await this.applyFiltersButton.click();
        await this.waitForApiRequest('/api/documents');
    }

    /**
     * Filter by assignment method
     */
    async filterByMethod(method: AssignmentMethod): Promise<void> {
        await this.openFilters();
        await this.methodFilter.selectOption(method);
        await this.applyFiltersButton.click();
        await this.waitForApiRequest('/api/documents');
    }

    /**
     * Clear all filters
     */
    async clearFilters(): Promise<void> {
        await this.clearFiltersButton.click();
        await this.waitForApiRequest('/api/documents');
    }

    // ============================================================================
    // Signature Assignment Actions
    // ============================================================================

    /**
     * Select assignment method
     */
    async selectAssignmentMethod(method: AssignmentMethod): Promise<void> {
        if (method === AssignmentMethod.VIRTUAL) {
            await this.virtualMethodRadio.click();
        } else {
            await this.collectMethodRadio.click();
        }
    }

    /**
     * Add a signer to the assignment
     */
    async addSigner(email: string): Promise<void> {
        await this.signerInput.fill(email);
        await this.addSignerButton.click();

        // Wait for signer to appear in list
        await expect(this.signersList.getByText(email)).toBeVisible();
    }

    /**
     * Add multiple signers
     */
    async addSigners(emails: string[]): Promise<void> {
        for (const email of emails) {
            await this.addSigner(email);
        }
    }

    /**
     * Set signature message
     */
    async setSignatureMessage(message: string): Promise<void> {
        await this.messageInput.fill(message);
    }

    /**
     * Set deadline in days
     */
    async setDeadlineDays(days: number): Promise<void> {
        await this.deadlineInput.fill(days.toString());
    }

    /**
     * Toggle sign order requirement
     */
    async toggleSignOrder(enabled: boolean): Promise<void> {
        const isChecked = await this.signOrderCheckbox.isChecked();
        if (enabled !== isChecked) {
            await this.signOrderCheckbox.click();
        }
    }

    /**
     * Create signature assignment
     */
    async createAssignment(): Promise<void> {
        await this.createAssignmentButton.click();
        await this.waitForApiRequest('/api/assignments');
    }

    /**
     * Complete virtual assignment flow
     */
    async createVirtualAssignment(data: AssignmentData): Promise<void> {
        await this.selectAssignmentMethod(AssignmentMethod.VIRTUAL);
        await this.addSigners(data.signerEmails);
        if (data.message) {
            await this.setSignatureMessage(data.message);
        }
        if (data.deadlineDays) {
            await this.setDeadlineDays(data.deadlineDays);
        }
        if (data.signInOrder !== undefined) {
            await this.toggleSignOrder(data.signInOrder);
        }
        await this.createAssignment();
    }

    /**
     * Complete collect assignment flow with positioned fields
     */
    async createCollectAssignment(data: AssignmentData): Promise<void> {
        await this.selectAssignmentMethod(AssignmentMethod.COLLECT);
        await this.addSigners(data.signerEmails);
        if (data.fields && data.fields.length > 0) {
            await this.addSignatureFields(data.fields);
        }
        if (data.message) {
            await this.setSignatureMessage(data.message);
        }
        if (data.deadlineDays) {
            await this.setDeadlineDays(data.deadlineDays);
        }
        await this.createAssignment();
    }

    /**
     * Add signature fields to collect assignment
     */
    async addSignatureFields(fields: SignatureField[]): Promise<void> {
        for (const field of fields) {
            await this.addFieldButton.click();
            // Field creation logic would interact with the PDF preview canvas
            // This is simplified - real implementation would click/drag on canvas
            await this.page.evaluate((fieldData) => {
                // Simulate field positioning - in real test, this would be user action
                console.log('Adding field:', fieldData);
            }, field);
        }
    }

    // ============================================================================
    // Document Detail Actions
    // ============================================================================

    /**
     * Go back to list from detail view
     */
    async goBack(): Promise<void> {
        await this.backButton.click();
    }

    /**
     * Download original document
     */
    async downloadOriginal(): Promise<void> {
        const downloadPromise = this.page.waitForEvent('download');
        await this.downloadOriginalButton.click();
        const download = await downloadPromise;
        expect(download.suggestedFilename()).toMatch(/\.pdf$/);
    }

    /**
     * Download certificated document
     */
    async downloadCertificated(): Promise<void> {
        const downloadPromise = this.page.waitForEvent('download');
        await this.downloadCertificatedButton.click();
        const download = await downloadPromise;
        expect(download.suggestedFilename()).toMatch(/certificado/i);
    }

    // ============================================================================
    // Assertions
    // ============================================================================

    /**
     * Assert page is loaded
     */
    async assertIsLoaded(): Promise<void> {
        await expect(this.heading).toBeVisible();
    }

    /**
     * Assert document is visible in list
     */
    async assertDocumentVisible(title: string): Promise<void> {
        await expect(this.documentsGrid.getByText(title)).toBeVisible();
    }

    /**
     * Assert document has specific status
     */
    async assertDocumentStatus(title: string, status: DocumentStatus): Promise<void> {
        const card = this.documentsGrid.getByText(title);
        await expect(card.getByTestId('document-status')).toHaveText(status);
    }

    /**
     * Assert upload modal is visible
     */
    async assertUploadModalVisible(): Promise<void> {
        await expect(this.uploadModal).toBeVisible();
    }

    /**
     * Assert signature modal is visible
     */
    async assertSignatureModalVisible(): Promise<void> {
        await expect(this.signatureModal).toBeVisible();
    }

    /**
     * Assert signer is in assignment list
     */
    async assertSignerInAssignment(email: string): Promise<void> {
        await expect(this.signersList.getByText(email)).toBeVisible();
    }

    /**
     * Assert detail view shows document
     */
    async assertDetailViewLoaded(title: string): Promise<void> {
        await expect(this.detailView).toBeVisible();
        await expect(this.detailTitle).toContainText(title);
    }

    /**
     * Assert no documents shown
     */
    async assertNoDocuments(): Promise<void> {
        await expect(this.emptyState).toBeVisible();
        await expect(this.emptyState).toContainText(/nenhum documento|no documents/i);
    }

    /**
     * Assert document count matches expected
     */
    async assertDocumentCount(count: number): Promise<void> {
        await expect.poll(async () => await this.getVisibleDocumentCount()).toBe(count);
    }
}
