import { test as base } from '@playwright/test';

/**
 * User authentication fixtures
 */
export interface AuthFixtures {
    authenticatedUser: {
        id: string;
        email: string;
        name: string;
        role: string;
    };
    adminUser: {
        id: string;
        email: string;
        name: string;
        role: string;
    };
}

/**
 * Test users fixture
 */
export const test = base.extend<AuthFixtures>({
    authenticatedUser: async ({ page }, use) => {
        const user = {
            id: 'user_1',
            email: 'teste2e@example.com',
            name: 'Usuário E2E',
            role: 'user',
        };

        // Set up authentication state
        await page.goto('/');
        await page.evaluate((userData) => {
            localStorage.setItem('auth_token', `mock_token_${userData.id}`);
            localStorage.setItem('user', JSON.stringify(userData));
            sessionStorage.setItem('auth_token', `mock_token_${userData.id}`);
        }, user);

        // Set authorization header for all API requests
        await page.route('**', (route) => {
            const headers = route.request().headers();
            headers['Authorization'] = `Bearer mock_token_${user.id}`;
            route.continue({ headers });
        });

        await use(user);

        // Cleanup after test
        await page.evaluate(() => {
            localStorage.clear();
            sessionStorage.clear();
        });
    },

    adminUser: async ({ page }, use) => {
        const user = {
            id: 'admin_1',
            email: 'admin@example.com',
            name: 'Administrador',
            role: 'admin',
        };

        await page.goto('/');
        await page.evaluate((userData) => {
            localStorage.setItem('auth_token', `mock_token_${userData.id}`);
            localStorage.setItem('user', JSON.stringify(userData));
        }, user);

        await page.route('**', (route) => {
            const headers = route.request().headers();
            headers['Authorization'] = `Bearer mock_token_${user.id}`;
            route.continue({ headers });
        });

        await use(user);

        await page.evaluate(() => {
            localStorage.clear();
            sessionStorage.clear();
        });
    },
});

export { expect } from '@playwright/test';
