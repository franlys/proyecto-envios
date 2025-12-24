import { test, expect } from '@playwright/test';

test('Dashboard loads and shows login or title', async ({ page }) => {
    await page.goto('/');

    // Expect a title "to contain" a substring.
    // Note: Depending on auth state, it might redirect to login.
    // Let's just check the title or that the body exists.
    await expect(page).toHaveTitle(/ProLogix|Login/);

    // Check if we are on login or dashboard
    // We expect at least the root div to be there
    await expect(page.locator('#root')).toBeVisible();
});
