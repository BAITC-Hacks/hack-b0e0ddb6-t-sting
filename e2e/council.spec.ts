import { expect, test } from '@playwright/test';

test('deliberates offline, rejects over-budget packages, restores and applies the recommendation', async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await page.getByRole('button', { name: 'пример плана', exact: true }).click();
  await page.getByRole('button', { name: /разобрать партию/ }).click();
  await expect(page.locator('.score-number')).toHaveText('56,54');
  await page.getByRole('button', { name: /вынести на совет/ }).click();
  await page.getByRole('button', { name: /начать заседание/ }).click();
  await expect(page.getByLabel('Протокол заседания')).toContainText('57,21');
  await expect(page.getByLabel('Проверка пакетов')).toContainText('104');
  await expect(page.getByLabel('Голосование')).toContainText('5 за');
  await expect(page.getByText(/персонажи вымышленные/)).toBeVisible();
  await page.reload();
  await expect(page.getByLabel('Протокол заседания')).toContainText('57,21');
  await page.screenshot({ path: testInfo.outputPath('council.png') });
  await page
    .getByLabel('Протокол заседания')
    .getByRole('button', { name: /принять/ })
    .click();
  await expect(page.locator('.score-number')).toHaveText('57,21');
  await page.getByRole('button', { name: /запись совета/ }).click();
  await expect(page.getByLabel('Протокол заседания')).toContainText('57,21');
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  expect(errors).toEqual([]);
});
