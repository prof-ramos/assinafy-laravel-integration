import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Dashboard Page Object
 *
 * Main dashboard showing document statistics and quick actions.
 */
export class DashboardPage extends BasePage {
    // ============================================================================
    // Locators
    // ============================================================================
    readonly heading: Locator;
    readonly statsContainer: Locator;
    readonly totalDocumentsCard: Locator;
    readonly pendingSignaturesCard: Locator;
    readonly certificatedDocumentsCard: Locator;
    readonly expiredDocumentsCard: Locator;

    readonly recentDocumentsSection: Locator;
    readonly recentDocumentsList: Locator;
    readonly viewAllDocumentsButton: Locator;

    readonly quickActionsSection: Locator;
    readonly uploadDocumentButton: Locator;
    readonly createSignerButton: Locator;
    readonly viewAllSignersButton: Locator;

    readonly documentsTable: Locator;
    readonly documentsTableRows: Locator;

    // ============================================================================
    // Constructor
    // ============================================================================
    constructor(page: Page) {
        super(page);

        this.heading = this.page.getByRole('heading', { name: /dashboard|painel/i });
        this.statsContainer = this.page.getByTestId('dashboard-stats');
        this.totalDocumentsCard = this.page.getByTestId('stat-total-documents');
        this.pendingSignaturesCard = this.page.getByTestId('stat-pending-signatures');
        this.certificatedDocumentsCard = this.page.getByTestId('stat-certificated');
        this.expiredDocumentsCard = this.page.getByTestId('stat-expired');

        this.recentDocumentsSection = this.page.getByTestId('recent-documents');
        this.recentDocumentsList = this.page.getByTestId('recent-documents-list');
        this.viewAllDocumentsButton = this.page.getByRole('link', { name: /ver todos|view all/i });

        this.quickActionsSection = this.page.getByTestId('quick-actions');
        this.uploadDocumentButton = this.page.getByRole('link', {
            name: /novo documento|upload documento|criar documento/i
        });
        this.createSignerButton = this.page.getByRole('link', {
            name: /novo signatário|criar signatário/i
        });
        this.viewAllSignersButton = this.page.getByRole('link', {
            name: /ver signatários|gerenciar signatários/i
        });

        this.documentsTable = this.page.getByTestId('documents-table');
        this.documentsTableRows = this.documentsTable.getByRole('row');
    }

    // ============================================================================
    // Navigation
    // ============================================================================

    /**
     * Navigate to dashboard
     */
    async goto(): Promise<void> {
        await this.goto('/');
        await this.waitForPageReady();
    }

    /**
     * Click upload document button
     */
    async clickUploadDocument(): Promise<void> {
        await this.uploadDocumentButton.click();
    }

    /**
     * Click create signer button
     */
    async clickCreateSigner(): Promise<void> {
        await this.createSignerButton.click();
    }

    /**
     * Click view all documents
     */
    async clickViewAllDocuments(): Promise<void> {
        await this.viewAllDocumentsButton.click();
    }

    /**
     * Click view all signers
     */
    async clickViewAllSigners(): Promise<void> {
        await this.viewAllSignersButton.click();
    }

    // ============================================================================
    // Statistics
    // ============================================================================

    /**
     * Get total documents count
     */
    async getTotalDocumentsCount(): Promise<number> {
        const text = await this.totalDocumentsCard.textContent();
        return parseInt(text?.match(/\d+/)?.[0] || '0', 10);
    }

    /**
     * Get pending signatures count
     */
    async getPendingSignaturesCount(): Promise<number> {
        const text = await this.pendingSignaturesCard.textContent();
        return parseInt(text?.match(/\d+/)?.[0] || '0', 10);
    }

    /**
     * Get certificated documents count
     */
    async getCertificatedDocumentsCount(): Promise<number> {
        const text = await this.certificatedDocumentsCard.textContent();
        return parseInt(text?.match(/\d+/)?.[0] || '0', 10);
    }

    /**
     * Get expired documents count
     */
    async getExpiredDocumentsCount(): Promise<number> {
        const text = await this.expiredDocumentsCard.textContent();
        return parseInt(text?.match(/\d+/)?.[0] || '0', 10);
    }

    // ============================================================================
    // Recent Documents
    // ============================================================================

    /**
     * Get list of recent document titles
     */
    async getRecentDocumentTitles(): Promise<string[]> {
        const titles = await this.recentDocumentsList
            .getByTestId(/document-title/)
            .allTextContents();
        return titles;
    }

    /**
     * Click on a document by title
     */
    async clickDocument(title: string): Promise<void> {
        await this.recentDocumentsList
            .getByRole('link', { name: title })
            .first()
            .click();
    }

    // ============================================================================
    // Assertions
    // ============================================================================

    /**
     * Assert page is loaded
     */
    async assertIsLoaded(): Promise<void> {
        await expect(this.heading).toBeVisible();
        await expect(this.statsContainer).toBeVisible();
        await expect(this.quickActionsSection).toBeVisible();
    }

    /**
     * Assert statistics match expected values
     */
    async assertStatistics(expected: {
        total?: number;
        pending?: number;
        certificated?: number;
        expired?: number;
    }): Promise<void> {
        if (expected.total !== undefined) {
            const actual = await this.getTotalDocumentsCount();
            expect(actual).toBe(expected.total);
        }
        if (expected.pending !== undefined) {
            const actual = await this.getPendingSignaturesCount();
            expect(actual).toBe(expected.pending);
        }
        if (expected.certificated !== undefined) {
            const actual = await this.getCertificatedDocumentsCount();
            expect(actual).toBe(expected.certificated);
        }
        if (expected.expired !== undefined) {
            const actual = await this.getExpiredDocumentsCount();
            expect(actual).toBe(expected.expired);
        }
    }

    /**
     * Assert document appears in recent list
     */
    async assertDocumentInRecentList(title: string): Promise<void> {
        await expect(
            this.recentDocumentsList.getByText(title)
        ).toBeVisible();
    }

    /**
     * Assert no documents shown
     */
    async assertNoDocuments(): Promise<void> {
        await expect(
            this.page.getByText(/nenhum documento|no documents/i)
        ).toBeVisible();
    }
}
