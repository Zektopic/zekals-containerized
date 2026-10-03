const { test, expect } = require('@playwright/test');
for (const [language, locale, phrase] of [['fr','fr-FR','Merci'],['it','it-IT','Grazie'],['zh','zh-CN','谢谢'],['si','si-LK','ස්තූතියි']]) {
  test(`${language} loads and inserts native phrases without losing composition`, async ({ page }) => {
    await page.addInitScript(code => localStorage.setItem('zekals.preferences', JSON.stringify({ language: code })), language);
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('lang', locale);
    await page.getByRole('button', { name: phrase, exact: true }).click();
    await expect(page.locator('#message')).toHaveValue(phrase);
    await page.locator('#undo').click(); await expect(page.locator('#message')).toHaveValue('');
    await page.setViewportSize({ width: 390, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}
test('Sinhala combining signs and join key have visible labels', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('zekals.preferences', JSON.stringify({ language: 'si' })));
  await page.goto('/'); await expect(page.locator('html')).toHaveAttribute('lang', 'si-LK');
  await page.locator('#keyboard-page').click();
  await expect(page.getByRole('button', { name: 'අකුරු බැඳීම', exact: true })).toBeVisible();
  const labels = await page.locator('#keyboard button').allTextContents();
  expect(labels.some(label => label.startsWith('◌'))).toBe(true);
});
test('IME composition commits one undo entry without rewriting the active editor', async ({ page }) => {
  await page.goto('/'); await expect(page.locator('#keyboard button').first()).toBeVisible();
  await page.locator('#message').fill('Hello ');
  await page.locator('#message').dispatchEvent('compositionstart');
  await page.locator('#message').evaluate(element => { element.value = 'Hello zhong'; element.dispatchEvent(new InputEvent('input', { bubbles: true, isComposing: true })); });
  await page.locator('#message').evaluate(element => { element.value = 'Hello 中'; element.dispatchEvent(new InputEvent('input', { bubbles: true, isComposing: true })); });
  await page.locator('#message').dispatchEvent('compositionend');
  await page.locator('#undo').click(); await expect(page.locator('#message')).toHaveValue('Hello ');
});
