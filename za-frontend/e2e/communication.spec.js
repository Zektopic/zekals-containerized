const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;

test.beforeEach(async ({ page }) => { await page.goto('/'); await expect(page.getByRole('button', { name: 'Q', exact: true })).toBeVisible(); });
test('messages, phrases, deletion and undo work without a camera', async ({ page }) => {
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.getByRole('button', { name: 'Q', exact: true }).click();
  await page.getByRole('button', { name: 'W', exact: true }).click();
  await expect(page.locator('#message')).toHaveValue('QW');
  await page.locator('#backspace').click(); await expect(page.locator('#message')).toHaveValue('Q');
  await page.locator('#clear').click(); await page.locator('#undo').click();
  await expect(page.locator('#message')).toHaveValue('Q');
  await page.locator('#message').fill('I need help');
  await page.locator('#clear').click(); await page.locator('#undo').click();
  await expect(page.locator('#message')).toHaveValue('I need help');
  expect(errors).toEqual([]);
});
test('dwell does not repeat or resume a paused interface without leaving target', async ({ page }) => {
  await page.locator('#settings-open').click(); await page.locator('[data-mode=dwell]').click();
  await page.locator('#settings-close').click();
  await page.getByRole('button', { name: 'Q', exact: true }).hover();
  await expect(page.locator('#message')).toHaveValue('Q', { timeout: 2500 });
  await page.waitForTimeout(1500); await expect(page.locator('#message')).toHaveValue('Q');
  await page.locator('#pause').hover(); await expect(page.locator('#pause')).toHaveAttribute('aria-pressed', 'true');
  await page.waitForTimeout(1500); await expect(page.locator('#pause')).toHaveAttribute('aria-pressed', 'true');
});
test('switch scan selects buttons and Escape pauses', async ({ page }) => {
  await page.locator('#settings-open').click(); await page.locator('[data-mode=scan]').click();
  await page.locator('#settings-close').click();
  await expect(page.locator('.scan-target')).toHaveCount(1, { timeout: 3000 });
  await page.keyboard.press('Escape'); await expect(page.locator('#pause')).toHaveAttribute('aria-pressed', 'true');
  await page.keyboard.press('Space'); await expect(page.locator('#pause')).toHaveAttribute('aria-pressed', 'false');
});
test('opening Settings prevents switch activation of the previous scan target', async ({ page }) => {
  await page.locator('#message').fill('Keep this message');
  await page.locator('#settings-open').click(); await page.locator('[data-mode=scan]').click();
  await page.locator('#settings-close').click();
  await expect(page.locator('#clear')).toHaveClass(/scan-target/, { timeout: 15000 });
  // A second switch press can arrive before the next scan timer runs.
  await page.evaluate(() => {
    document.getElementById('settings-open').click();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', code: 'Space', bubbles: true }));
  });
  await expect(page.locator('#message')).toHaveValue('Keep this message');
  await expect(page.locator('#settings .scan-target')).toHaveCount(1);
  await expect(page.locator('.scan-target')).toHaveCount(1);
});
test('WCAG automated checks and mobile layout', async ({ page }) => {
  const result = await new AxeBuilder({ page }).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze();
  expect(result.violations).toEqual([]);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const bounds = await page.locator('#keyboard button').evaluateAll(buttons => buttons.map(b => b.getBoundingClientRect()).every(r => r.width >= 44 && r.height >= 44));
  expect(bounds).toBe(true);
  await page.locator('#settings-open').click();
  const settings = await new AxeBuilder({ page }).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
  expect(settings.violations).toEqual([]);
});
