import { test, expect } from '@playwright/test';

test('home responds with 200', async ({ page }) => {
  const response = await page.goto('/');
  expect(response?.status()).toBeLessThan(400);
});
