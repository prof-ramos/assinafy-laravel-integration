import { Page, Locator, ExpectOptions } from '@playwright/test';

/**
 * Base Page Object
 *
 * Provides common functionality and utilities for all page objects.
 * All page objects should extend this base class.
 */
export abstract class BasePage {
    readonly page: Page;

    // Common locators that appear on most pages
    readonly loadingSpinner: Locator;
    readonly flashMessage: Locator;
    readonly flashSuccess: Locator;
    readonly flashError: Locator;
    readonly mainNavigation: Locator;
    readonly userMenu: Locator;
    readonly logoutButton: Locator;

    constructor(page: Page) {
        this.page = page;

        // Initialize common locators using data-testid attributes
        this.loadingSpinner = page.getByTestId('loading-spinner');
        this.flashMessage = page.getByTestId('flash-message');
        this.flashSuccess = page.getByTestId('flash-success');
        this.flashError = page.getByTestId('flash-error');
        this.mainNavigation = page.getByTestId('main-navigation');
        this.userMenu = page.getByTestId('user-menu');
        this.logoutButton = page.getByRole('button', { name: /sair|logout/i });
    }

    // ============================================================================
    // Navigation Methods
    // ============================================================================

    /**
     * Navigate to a specific path
     */
    async goto(path: string = ''): Promise<void> {
        await this.page.goto(path);
    }

    /**
     * Reload the current page
     */
    async reload(): Promise<void> {
        await this.page.reload();
    }

    /**
     * Go back in browser history
     */
    async back(): Promise<void> {
        await this.page.goBack();
    }

    // ============================================================================
    // Waiting Methods
    // ============================================================================

    /**
     * Wait for page to be fully loaded
     */
    async waitForPageReady(): Promise<void> {
        await this.page.waitForLoadState('networkidle');
    }

    /**
     * Wait for loading spinner to disappear
     */
    async waitForLoadingToFinish(): Promise<void> {
        await this.loadingSpinner.waitFor({ state: 'detached', timeout: 10000 }).catch(() => {
            // If no spinner exists, that's okay
        });
    }

    /**
     * Wait for API request to complete
     */
    async waitForApiRequest(urlPattern: string): Promise<void> {
        await this.page.waitForResponse(
            response => response.url().includes(urlPattern) && response.status() < 500
        );
    }

    // ============================================================================
    // Flash Message Methods
    // ============================================================================

    /**
     * Get the current flash message text
     */
    async getFlashMessage(): Promise<string> {
        const element = this.flashMessage.first();
        await element.waitFor({ state: 'visible', timeout: 5000 });
        return await element.textContent() || '';
    }

    /**
     * Check if success message is visible
     */
    async isSuccessMessageVisible(): Promise<boolean> {
        return await this.flashSuccess.isVisible().catch(() => false);
    }

    /**
     * Check if error message is visible
     */
    async isErrorMessageVisible(): Promise<boolean> {
        return await this.flashError.isVisible().catch(() => false);
    }

    /**
     * Assert success message is shown with expected text
     */
    async assertSuccess(message: string): Promise<void> {
        await this.flashSuccess.waitFor({ state: 'visible' });
        await this.flashSuccess.getByText(message, { exact: false }).waitFor();
    }

    /**
     * Assert error message is shown with expected text
     */
    async assertError(message: string): Promise<void> {
        await this.flashError.waitFor({ state: 'visible' });
        await this.flashError.getByText(message, { exact: false }).waitFor();
    }

    // ============================================================================
    // Authentication Methods
    // ============================================================================

    /**
     * Check if user is logged in
     */
    async isLoggedIn(): Promise<boolean> {
        return await this.userMenu.isVisible().catch(() => false);
    }

    /**
     * Logout current user
     */
    async logout(): Promise<void> {
        await this.userMenu.click();
        await this.logoutButton.click();
        await this.page.waitForURL('/login');
    }

    // ============================================================================
    // Utility Methods
    // ============================================================================

    /**
     * Click element and wait for navigation
     */
    async clickAndWaitForNavigation(selector: string | Locator): Promise<void> {
        const locator = typeof selector === 'string'
            ? this.page.locator(selector)
            : selector;

        await Promise.all([
            this.page.waitForLoadState('networkidle'),
            locator.click(),
        ]);
    }

    /**
     * Fill form field with label
     */
    async fillByLabel(label: string, value: string): Promise<void> {
        await this.page.getByLabel(label).fill(value);
    }

    /**
     * Select option from select by label
     */
    async selectByLabel(label: string, option: string): Promise<void> {
        await this.page.getByLabel(label).selectOption(option);
    }

    /**
     * Take screenshot with timestamp
     */
    async screenshot(name: string): Promise<void> {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        await this.page.screenshot({
            path: `test-results/screenshots/${name}-${timestamp}.png`,
            fullPage: true,
        });
    }

    /**
     * Execute JavaScript in page context
     */
    async evaluate<T>(fn: () => T): Promise<T> {
        return await this.page.evaluate(fn);
    }

    /**
     * Get current URL
     */
    getUrl(): URL {
        return new URL(this.page.url());
    }

    /**
     * Check if current URL matches path
     */
    async isCurrentPath(path: string): Promise<boolean> {
        await this.page.waitForLoadState('domcontentloaded');
        const currentPath = this.getUrl().pathname;
        return currentPath === path || currentPath.startsWith(path + '/');
    }
}
