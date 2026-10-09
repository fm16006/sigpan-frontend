import { expect, test } from '@playwright/test';

test('la aplicación carga y muestra el cascarón con el nombre del sistema', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'SIGPAN' })).toBeVisible();
});
