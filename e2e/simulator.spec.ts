import { expect, test } from '@playwright/test';

test('reviews the real plan, applies an improvement, and persists the result', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await page.getByRole('button', { name: 'пропустить', exact: true }).click();
  await expect(page).toHaveTitle('QOL-SIM — Разбор партии');
  await page.getByRole('button', { name: 'пример плана', exact: true }).click();
  await page.getByRole('button', { name: /разобрать партию/ }).click();
  await expect(page.locator('.score-number')).toHaveText('56,54');
  await expect(page.getByLabel('Результат плана')).toContainText('+3,99');
  await expect(page.getByLabel('Результат плана')).toContainText('694');
  await page
    .getByRole('button', { name: 'Применить замену M5 на M3', exact: true })
    .click();
  await expect(page.getByRole('dialog')).toContainText('57,21');
  await page.getByRole('button', { name: /подтвердить замену/ }).click();
  await expect(page.locator('.score-number')).toHaveText('57,21');
  await page.getByRole('button', { name: /показать оптимум/ }).click();
  await expect(page.getByRole('dialog')).toContainText('57,24');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByText('офлайн', { exact: true })).toBeVisible();
  await page
    .getByRole('button', { name: 'отправить в реестр', exact: true })
    .click();
  await page.getByLabel('название команды').fill('E2E — тестовая команда');
  await page.getByRole('button', { name: /отправить план/ }).click();
  await expect(page.getByRole('dialog')).toContainText('сохранён');
  await page.getByRole('button', { name: /открыть реестр/ }).click();
  const row = page
    .getByRole('row')
    .filter({ hasText: 'E2E — тестовая команда' });
  await expect(row).toContainText('57,21');
  await page.reload();
  await page.getByRole('button', { name: 'реестр', exact: true }).click();
  await expect(
    page.getByRole('row').filter({ hasText: 'E2E — тестовая команда' }),
  ).toContainText('57,21');
  expect(errors).toEqual([]);
});

test('blocks invalid plans and exposes the harmful plan’s negative effect on mobile', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByRole('button', { name: 'пропустить', exact: true }).click();
  await expect(
    page.getByRole('button', { name: /разобрать партию/ }),
  ).toBeDisabled();
  await page.getByRole('button', { name: 'план-ловушка', exact: true }).click();
  await page.getByRole('button', { name: /разобрать партию/ }).click();
  await expect(page.locator('.score-number')).toHaveText('52,45');
  await expect(page.getByLabel('Результат плана')).toContainText('-0,11');
  await expect(page.getByText('?? грубая ошибка')).toBeVisible();
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
});

test('keeps real keyboard focus inside the district radio dialog', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'пропустить', exact: true }).click();
  await page.getByRole('button', { name: /M1 Выделенные/ }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(
    page.getByRole('button', { name: /добавить меру/ }),
  ).toBeDisabled();
  for (let index = 0; index < 8; index++) {
    await page.keyboard.press('Tab');
    expect(
      await dialog.evaluate((element) =>
        element.contains(document.activeElement),
      ),
    ).toBe(true);
  }
  await page.getByRole('radio').nth(3).check();
  for (let index = 0; index < 8; index++) {
    await page.keyboard.press('Shift+Tab');
    expect(
      await dialog.evaluate((element) =>
        element.contains(document.activeElement),
      ),
    ).toBe(true);
  }
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
});

test('recovers from a failed scenario request without losing usable navigation', async ({
  page,
}) => {
  await page.route('**/api/scenario', (route) =>
    route.fulfill({ status: 503, json: { message: 'unavailable' } }),
  );
  await page.goto('/');
  await expect(page.getByText('# сценарий недоступен')).toBeVisible();
  await page.unroute('**/api/scenario');
  await page.getByRole('button', { name: /повторить/i }).click();
  await expect(
    page.getByRole('button', { name: 'пример плана', exact: true }),
  ).toBeVisible();
});
