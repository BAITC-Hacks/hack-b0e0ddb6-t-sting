import { expect, test } from '@playwright/test';

test('checks the real browser, API, and database connection repeatedly', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'пропустить', exact: true }).click();
  const checkButton = page.getByRole('button', { name: /API/ });
  await expect(checkButton).toHaveClass(/success/);
  // No interception: browser -> Vite -> Nest -> PostgreSQL.
  for (let attempt = 0; attempt < 2; attempt++) {
    const responsePromise = page.waitForResponse('**/api/health');
    await checkButton.click();
    const response = await responsePromise;
    expect(response.status()).toBe(200);
    expect(response.headers()['cache-control']).toBe('no-store');
    expect(await response.json()).toEqual({ status: 'ok', database: 'up' });
    await expect(checkButton).toHaveClass(/success/);
    await expect(checkButton).toBeEnabled();
  }
});

test('shows progress and prevents duplicate checks while a request is pending', async ({
  page,
}) => {
  let releaseRequest!: () => void;
  const gate = new Promise<void>((resolve) => {
    releaseRequest = resolve;
  });
  await page.route('**/api/health', async (route) => {
    await gate;
    await route.continue();
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'пропустить', exact: true }).click();
  const checkButton = page.getByRole('button', { name: /API/ });
  try {
    await expect(checkButton).toHaveClass(/loading/);
    await expect(checkButton).toBeDisabled();
  } finally {
    releaseRequest();
  }
  await expect(checkButton).toHaveClass(/success/);
  await expect(checkButton).toBeEnabled();
});

for (const failure of [
  'unavailable service',
  'invalid response',
  'network error',
]) {
  test(`recovers from ${failure} when the user retries`, async ({ page }) => {
    await page.route('**/api/health', async (route) => {
      if (failure === 'network error') await route.abort('failed');
      else
        await route.fulfill({
          status: failure === 'unavailable service' ? 503 : 200,
          json: { status: 'error', database: 'down' },
        });
    });
    await page.goto('/');
    await page.getByRole('button', { name: 'пропустить', exact: true }).click();
    const checkButton = page.getByRole('button', { name: /API/ });
    await expect(checkButton).toHaveClass(/error/);
    await expect(checkButton).toBeEnabled();
    // Keep the fault active across StrictMode's initial effect replay.
    await page.unroute('**/api/health');
    await checkButton.click();
    await expect(checkButton).toHaveClass(/success/);
    await expect(checkButton).toBeEnabled();
  });
}
