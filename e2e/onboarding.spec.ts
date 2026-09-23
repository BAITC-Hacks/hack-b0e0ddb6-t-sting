import { expect, test } from '@playwright/test';

test('introduces the model, finishes in the empty constructor, and can reopen', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await expect(page).toHaveTitle('QOL-SIM — Разбор партии');
  const dialog = page.getByRole('dialog');
  await expect(dialog).toHaveAccessibleName('как это работает · 1 / 7');
  await expect(dialog).toContainText('ИИ ничего не считает');
  await expect(
    dialog.getByRole('button', { name: 'назад', exact: true }),
  ).toBeDisabled();
  await page.getByRole('button', { name: 'далее →', exact: true }).click();
  await expect(dialog.getByRole('img')).toBeVisible();
  await page.getByRole('button', { name: 'далее →', exact: true }).click();
  await expect(dialog).toContainText('автобусные полосы + ЛРТ');
  await page.getByRole('button', { name: 'далее →', exact: true }).click();
  await expect(dialog).toContainText('+16 × 5/8 = +10');
  await dialog.getByRole('button', { name: '0', exact: true }).click();
  await expect(dialog).toContainText('38 → 54');
  await expect(dialog).toContainText('для примера: у школы лаг 3');
  await page.getByRole('button', { name: 'далее →', exact: true }).click();
  await expect(dialog).toContainText('52.56');
  await page.getByRole('button', { name: 'далее →', exact: true }).click();
  await expect(dialog).toContainText('≈ +1.45');
  await page
    .getByRole('button', { name: 'переходы · Алматы', exact: true })
    .click();
  await expect(dialog).toContainText('−0.87');
  await page.getByRole('button', { name: 'далее →', exact: true }).click();
  await page
    .getByRole('button', { name: 'подробнее: термины', exact: true })
    .click();
  await expect(dialog).toContainText('КПД');
  await expect(dialog).toContainText('694 395');
  await page
    .getByRole('button', { name: 'собрать план →', exact: true })
    .click();
  await expect(dialog).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: /разобрать партию/ }),
  ).toBeDisabled();
  await page.reload();
  const help = page.getByRole('button', {
    name: '[?] как это работает',
    exact: true,
  });
  await expect(
    page.getByRole('button', { name: 'пример плана', exact: true }),
  ).toBeVisible();
  await expect(dialog).toHaveCount(0);
  await page.getByRole('button', { name: 'пример плана', exact: true }).click();
  await expect(
    page.getByRole('button', { name: /разобрать партию/ }),
  ).toBeEnabled();
  await help.click();
  await expect(dialog).toHaveAccessibleName('как это работает · 1 / 7');
  await page
    .getByRole('button', { name: 'Шаг 7: Результаты', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'подробнее: термины', exact: true })
    .click();
  for (const direction of ['Tab', 'Shift+Tab']) {
    for (let index = 0; index < 14; index++) {
      await page.keyboard.press(direction);
      expect(
        await dialog.evaluate((element) =>
          element.contains(document.activeElement),
        ),
      ).toBe(true);
    }
  }
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(help).toBeFocused();
  await expect(
    page.getByRole('button', { name: /разобрать партию/ }),
  ).toBeEnabled();
  expect(errors).toEqual([]);
});

for (const width of [390, 320]) {
  test(`keeps all onboarding steps and navigation usable at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 720 });
    await page.goto('/');
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    for (let index = 0; index < 7; index++) {
      await dialog
        .getByRole('navigation', { name: 'Шаги обучения' })
        .getByRole('button')
        .nth(index)
        .click();
      await expect(dialog).toHaveAccessibleName(
        `как это работает · ${index + 1} / 7`,
      );
      if (index < 6) {
        const columns = page
          .locator('.onboarding-columns')
          .locator(':scope > *');
        const copy = await columns.nth(0).boundingBox();
        const illustration = await columns.nth(1).boundingBox();
        expect(illustration!.y).toBeGreaterThanOrEqual(copy!.y + copy!.height);
        expect(copy!.width).toBeGreaterThan(width - 110);
      }
      if (index === 6)
        await dialog
          .getByRole('button', { name: 'подробнее: термины' })
          .click();
      expect(
        await dialog.evaluate(
          (element) => element.scrollWidth <= element.clientWidth,
        ),
      ).toBe(true);
      expect(
        await page
          .locator('.onboarding-content')
          .evaluate((element) => element.scrollWidth <= element.clientWidth),
      ).toBe(true);
      const footer = await page.locator('.onboarding-footer').boundingBox();
      expect(footer!.y + footer!.height).toBeLessThanOrEqual(720);
    }
    await dialog.getByRole('button', { name: 'собрать план →' }).click();
    await expect(dialog).toHaveCount(0);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  });
}

test('closes with the cross and remembers the choice on reload', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Закрыть диалог' }).click();
  await page.reload();
  await expect(
    page.getByRole('button', { name: 'пример плана', exact: true }),
  ).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(0);
});
