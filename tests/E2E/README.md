# E2E Test Suite for Assinafy Integration

Complete end-to-end testing infrastructure for the Assinafy digital signature platform integration.

## 📋 Table of Contents

- [Overview](#overview)
- [Test Coverage](#test-coverage)
- [Quick Start](#quick-start)
- [Running Tests](#running-tests)
- [Test Structure](#test-structure)
- [Writing Tests](#writing-tests)
- [CI/CD Integration](#cicd-integration)
- [Troubleshooting](#troubleshooting)

## 🎯 Overview

This E2E test suite uses **Playwright** to test the Assinafy integration through actual browser interactions. It covers:

- Signer management
- Document upload and processing
- Virtual signature assignments
- Collect signature assignments (positioned fields)
- Webhook event processing
- Signature flow (signer perspective)

### Key Features

- ✅ **Multi-browser support**: Chromium, Firefox, WebKit, Mobile
- ✅ **Parallel execution**: Fast test runs
- ✅ **API mocking**: Reliable tests without external dependencies
- ✅ **Visual regression**: Screenshot comparison
- ✅ **Accessibility testing**: ARIA compliance checks
- ✅ **Trace on retry**: Automatic debugging for flaky tests
- ✅ **Page Object Model**: Maintainable test code

## 📊 Test Coverage

| Feature Area | Coverage | Test Files |
|--------------|----------|------------|
| Signer Management | 90%+ | `signer-management.spec.ts` |
| Document Upload | 85%+ | `document-upload.spec.ts` |
| Virtual Assignments | 85%+ | `signature-assignment.spec.ts` |
| Collect Assignments | 80%+ | `signature-assignment.spec.ts` |
| Signature Flow | 85%+ | `signature-flow.spec.ts` |
| Webhook Processing | 75%+ | `webhook-processing.spec.ts` |
| **Total Coverage** | **~83%** | **6 test files** |

## 🚀 Quick Start

### Prerequisites

```bash
# PHP 8.3+
php --version

# Node.js 20+
node --version

# MySQL 8.0+
mysql --version
```

### Installation

```bash
# 1. Navigate to E2E test directory
cd tests/E2E

# 2. Install dependencies
npm install

# 3. Install Playwright browsers
npx playwright install --with-deps

# 4. Copy environment file
cp .env.testing.example .env.testing

# 5. Update .env.testing with your test values
# - APP_URL
# - Database credentials
# - Assinafy API keys (sandbox)
```

### Running Tests

```bash
# Run all tests
npm test

# Run in headed mode (see browser)
npm run test:headed

# Run in debug mode (with inspector)
npm run test:debug

# Run specific browser
npm run test:chromium
npm run test:firefox
npm run test:webkit
npm run test:mobile

# View HTML report
npm run test:report
```

## 🧪 Running Tests

### Local Development

```bash
# Run all tests in parallel
npm test

# Run specific test file
npx playwright test signer-management.spec.ts

# Run tests matching pattern
npx playwright test --grep "signer"

# Run with trace on first retry
npx playwright test --trace=on-first-retry

# Run with video recording
npx playwright test --video=on
```

### Debugging

```bash
# Debug mode with Playwright Inspector
npm run test:debug

# Run with UI mode
npx playwright test --ui

# Run with headed mode
npx playwright test --headed --project=chromium

# Show browser console
npx playwright test --debug
```

### CI Environment

```bash
# Run with CI-specific settings
CI=true npm test

# Run single-threaded (recommended for CI)
CI=true npx playwright test --workers=1

# Generate JUnit report
npx playwright test --reporter=junit
```

## 📁 Test Structure

```
tests/E2E/
├── playwright.config.ts       # Playwright configuration
├── package.json                # NPM dependencies
├── tsconfig.json              # TypeScript configuration
├── .env.testing.example        # Environment template
│
├── Pages/                      # Page Objects
│   ├── BasePage.ts            # Base page functionality
│   ├── DashboardPage.ts       # Dashboard page
│   ├── DocumentsPage.ts       # Documents management
│   ├── SignersPage.ts         # Signers management
│   ├── SignatureFlowPage.ts   # Signature flow
│   └── index.ts               # Barrel export
│
├── Spec/                       # Test Specifications
│   ├── signer-management.spec.ts
│   ├── document-upload.spec.ts
│   ├── signature-assignment.spec.ts
│   ├── signature-flow.spec.ts
│   └── webhook-processing.spec.ts
│
├── Helpers/                    # Test Utilities
│   ├── api-mocks.ts           # API mocking helpers
│   ├── pdf-helpers.ts         # PDF utilities
│   └── index.ts               # Barrel export
│
├── Fixtures/                   # Test Fixtures
│   ├── auth.fixtures.ts       # Auth fixtures
│   ├── test-data.fixtures.ts  # Data fixtures
│   └── index.ts
│
├── test-results/              # Generated (gitignored)
│   ├── artifacts/             # Screenshots, videos
│   ├── playwright-report/     # HTML report
│   └── traces/                # Debug traces
│
└── README.md                   # This file
```

## ✍️ Writing Tests

### Basic Test Structure

```typescript
import { test, expect, describe } from '@playwright/test';
import { SignersPage } from '../Pages';
import { mockAssinafyApi } from '../Helpers';

describe.describe('My Feature', () => {
    test('should do something important', async ({ page }) => {
        // Arrange
        const signersPage = new SignersPage(page);
        await mockAssinafyApi(page);

        // Act
        await signersPage.goto();
        await signersPage.clickNewSigner();

        // Assert
        await expect(page.getByText('Success')).toBeVisible();
    });
});
```

### Using Page Objects

```typescript
import { DocumentsPage, AssignmentMethod } from '../Pages';

test('create signature assignment', async ({ page }) => {
    const docsPage = new DocumentsPage(page);

    await docsPage.goto();
    await docsPage.uploadDocument({ title: 'Test' }, 'dummy.pdf');
    await docsPage.clickCreateSignatureById('doc_1');
    await docsPage.selectAssignmentMethod(AssignmentMethod.VIRTUAL);
    await docsPage.addSigner('signer@example.com');
    await docsPage.createAssignment();
});
```

### API Mocking

```typescript
import { mockAssinafyApi, MockAssinafyApiOptions } from '../Helpers';

const mockOptions: MockAssinafyApiOptions = {
    uploadDocument: {
        documentId: 'doc_test_123',
        status: 'metadata_ready',
    },
    createVirtualAssignment: {
        assignmentId: 'assign_test_456',
    },
};

await mockAssinafyApi(page, mockOptions);
```

### Test Data Fixtures

```typescript
import { test } from '../Fixtures/test-data.fixtures';

test('using test data', async ({ page, testSigner, testDocument }) => {
    const signersPage = new SignersPage(page);

    await signersPage.goto();
    await signersPage.createSigner(testSigner);
});
```

## 🔄 CI/CD Integration

### GitHub Actions

The `.github/workflows/e2e-tests.yml` workflow:

1. Runs on every push/PR to main/develop
2. Sets up MySQL service
3. Installs dependencies
4. Runs migrations
5. Executes Playwright tests
6. Uploads artifacts (reports, screenshots, videos)
7. Comments PR with results

### Required Secrets

Configure these in GitHub repository settings:

```
ASSINAFY_API_KEY         # Test Assinafy API key
ASSINAFY_ACCOUNT_ID       # Test Assinafy account ID
```

### Local CI Testing

```bash
# Simulate CI environment
CI=true npm test

# With JUnit output
CI=true npx playwright test --reporter=junit
```

## 🐛 Troubleshooting

### Common Issues

#### Tests timeout

```bash
# Increase timeout in playwright.config.ts
timeout: 60000  # 60 seconds

# Or for specific test
test.setTimeout(60000);
```

#### Flaky tests

```bash
# Run with trace to debug
npx playwright test --trace=on

# Run specific test repeatedly
npx playwright test --repeat=10 --grep "flaky test"
```

#### Browser not found

```bash
# Reinstall browsers
npx playwright install --force
```

#### Port already in use

```bash
# Kill existing Laravel server
pkill -f "php artisan serve"

# Or use different port
php artisan serve --port=8001
```

### Debugging Failed Tests

```bash
# View trace in Playwright Inspector
npx playwright show-trace test-results/traces/[trace-name].zip

# View HTML report
npm run test:report

# View screenshots
open test-results/screenshots/
```

## 📚 Additional Resources

- [Playwright Documentation](https://playwright.dev)
- [Page Object Model](https://playwright.dev/docs/pom)
- [API Testing](https://playwright.dev/docs/api-testing)
- [Accessibility Testing](https://playwright.dev/docs/accessibility-testing)
- [Visual Regression](https://playwright.dev/docs/screenshots)

## 🤝 Contributing

When adding new tests:

1. **Follow the pattern**: Use existing tests as templates
2. **Use Page Objects**: Don't use raw selectors
3. **Mock external APIs**: Use `mockAssinafyApi`
4. **Add data-testid**: Add stable selectors to HTML
5. **Test user behavior**: Focus on what users see/do
6. **Keep it isolated**: Each test should work independently

## 📝 Test Checklist

Before committing:

- [ ] Tests pass locally
- [ ] No `console.log` left in code
- [ ] Proper test grouping (`describe` blocks)
- [ ] Clear test names
- [ ] Assertions for expected behavior
- [ ] Error cases covered
- [ ] Accessibility considered
- [ ] Page Objects used
- [ ] Data attributes added to views

## 📄 License

Same as parent project.
