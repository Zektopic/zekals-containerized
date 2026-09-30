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
