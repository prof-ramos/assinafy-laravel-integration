import { defineConfig, devices, Project } from '@playwright/test';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.testing' });

const isCI = !!process.env.CI;

/**
 * Playwright E2E Test Configuration for Assinafy Integration
 *
 * This configuration supports:
 * - Multi-browser testing (Chromium, Firefox, WebKit, Mobile)
 * - Parallel execution for faster test runs
 * - Automatic retry on CI
 * - Trace, screenshot, and video capture on failure
 * - Laravel development server startup
 * - API mocking for external Assinafy calls
 */
export default defineConfig({
    // ============================================================================
    // Test Directory & Timeout
    // ============================================================================
    testDir: './Specs',
    testMatch: '**/*.spec.ts',

    // Global timeout for each test
    timeout: isCI ? 60000 : 30000,

    // Expect assertion timeout
    expect: {
        timeout: 10000,
        // Soft assertions - collect all failures before failing
        toHaveScreenshot: { maxDiffPixels: 100, threshold: 0.2 },
    },

    // ============================================================================
    // Execution Settings
    // ============================================================================
    // Run tests in parallel by default
    fullyParallel: true,

    // Fail on `test.only` in CI
    forbidOnly: isCI,

    // Retry on CI only (local runs are faster without retries)
    retries: isCI ? 2 : 0,

    // Limit workers in CI to avoid resource issues
    workers: isCI ? 2 : undefined,

    // ============================================================================
    // Reporting
    // ============================================================================
    reporter: [
        // HTML report with trace viewing
        ['html', {
            outputFolder: '../playwright-report',
            open: 'never',
        }],
        // JUnit for CI integration
        ['junit', {
            outputFile: '../test-results/e2e-junit.xml',
        }],
        // Console output
        ['list'],
    ],

    // ============================================================================
    // Global Settings
    // ============================================================================
    use: {
        // Base URL for all tests (Laravel app)
        baseURL: process.env.APP_URL || 'http://localhost:8000',

        // Capture trace on first retry (helps debug flaky tests)
        trace: 'on-first-retry',

        // Capture screenshots only on failure
        screenshot: 'only-on-failure',

        // Retain video only on failure
        video: 'retain-on-failure',

        // Action timeout
        actionTimeout: 15000,

        // Navigation timeout
        navigationTimeout: 30000,

        // Extra HTTP headers (e.g., for API authentication)
        extraHTTPHeaders: {
            'Accept': 'application/json',
        },

        // Ignore HTTPS errors for self-signed certs in testing
        ignoreHTTPSErrors: true,

        // Context options
        viewport: { width: 1280, height: 720 },
        ignoreAPIErrors: false,
    },

    // ============================================================================
    // Projects - Browser & Device Configurations
    // ============================================================================
    projects: [
        // Desktop Chromium
        {
            name: 'chromium',
            use: {
                ...devices['Desktop Chrome'],
                // Chrome-specific launch options
                launchOptions: {
                    args: ['--disable-web-security'],
                },
            },
        },

        // Desktop Firefox
        {
            name: 'firefox',
            use: {
                ...devices['Desktop Firefox'],
            },
        },

        // Desktop Safari (WebKit)
        {
            name: 'webkit',
            use: {
                ...devices['Desktop Safari'],
            },
        },

        // Mobile - iPhone (responsive testing)
        {
            name: 'mobile-iphone',
            use: {
                ...devices['iPhone 13 Pro'],
            },
        },

        // Mobile - Android
        {
            name: 'mobile-android',
            use: {
                ...devices['Pixel 5'],
            },
        },

        // ============================================================================
        // Sharding for Parallel Execution (CI)
        // ============================================================================
        // Uncomment and use these shards when running in CI with multiple runners
        // Usage: npx playwright test --project=shard-1
        /*
        {
            name: 'shard-1',
            use: { ...devices['Desktop Chrome'] },
            shard: { current: 1, total: 4 },
        },
        {
            name: 'shard-2',
            use: { ...devices['Desktop Chrome'] },
            shard: { current: 2, total: 4 },
        },
        {
            name: 'shard-3',
            use: { ...devices['Desktop Chrome'] },
            shard: { current: 3, total: 4 },
        },
        {
            name: 'shard-4',
            use: { ...devices['Desktop Chrome'] },
            shard: { current: 4, total: 4 },
        },
        */
    ],

    // ============================================================================
    // Development Server
    // ============================================================================
    // Automatically start Laravel development server before tests
    webServer: {
        command: 'php artisan serve --host=127.0.0.1 --port=8000',
        url: 'http://127.0.0.1:8000',
        timeout: 120000, // 2 minutes max startup time
        reuseExistingServer: !isCI, // Reuse server locally
        stdout: 'pipe',
        stderr: 'pipe',
    },

    // ============================================================================
    // Output Directories
    // ============================================================================
    outputDir: '../test-results/artifacts',

    // ============================================================================
    // Global Setup & Teardown
    // ============================================================================
    // globalSetup: require.resolve('./tests/E2E/global-setup'),
    // globalTeardown: require.resolve('./tests/E2E/global-teardown'),
});
