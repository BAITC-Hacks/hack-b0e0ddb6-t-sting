import { expect, test } from '@playwright/test';

test('checks the real browser, API, and database connection repeatedly', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.getByRole('status')).toContainText('Ready to connect');

  // No request interception: this exercises Vite, NestJS, TypeORM, and PostgreSQL.
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const responsePromise = page.waitForResponse('**/api/health');
    await page.getByRole('button', { name: 'Check connection' }).click();
    const response = await responsePromise;

    expect(response.status()).toBe(200);
    expect(response.headers()['cache-control']).toBe('no-store');
    expect(await response.json()).toEqual({ status: 'ok', database: 'up' });
    await expect(page.getByRole('status')).toContainText(
      'All systems connected',
    );
    await expect(
      page.getByRole('button', { name: 'Check connection' }),
    ).toBeEnabled();
  }
});

test('shows progress and prevents duplicate checks while a request is pending', async ({
  page,
}) => {
  let releaseRequest!: () => void;
  const gate = new Promise<void>((resolve) => {
    releaseRequest = resolve;
  });
  // Hold only this browser's request; release it to the real API without a sleep.
  await page.route('**/api/health', async (route) => {
    await gate;
    await route.continue();
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Check connection' }).click();

  try {
    await expect(page.getByRole('status')).toContainText('Checking connection');
    await expect(
      page.getByRole('button', { name: 'Checking…' }),
    ).toBeDisabled();
  } finally {
    releaseRequest();
  }

  await expect(page.getByRole('status')).toContainText('All systems connected');
  await expect(
    page.getByRole('button', { name: 'Check connection' }),
  ).toBeEnabled();
});

for (const failure of [
  'unavailable service',
  'invalid response',
  'network error',
]) {
  test(`recovers from ${failure} when the user retries`, async ({ page }) => {
    // Fault injection is confined to the first request in this isolated context.
    await page.route(
      '**/api/health',
      async (route) => {
        if (failure === 'network error') {
          await route.abort('failed');
        } else {
          await route.fulfill({
            status: failure === 'unavailable service' ? 503 : 200,
            json: { status: 'error', database: 'down' },
          });
        }
      },
      { times: 1 },
    );
    await page.goto('/');
    const checkButton = page.getByRole('button', { name: 'Check connection' });
    await checkButton.click();

    await expect(page.getByRole('status')).toContainText(
      'Connection unavailable',
    );
    await expect(checkButton).toBeEnabled();

    // The retry reaches the real database, proving recovery to a usable state.
    await checkButton.click();
    await expect(page.getByRole('status')).toContainText(
      'All systems connected',
    );
    await expect(checkButton).toBeEnabled();
  });
}
