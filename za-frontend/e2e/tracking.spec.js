const { test, expect } = require('@playwright/test');
test('real calibration path cancels pending gaze selection on tracking loss', async ({ page }) => {
  test.setTimeout(40000);
  await page.setViewportSize({ width: 1440, height: 1600 });
  let current = { type: 'gaze', valid: true, x: .45, y: .45 }, transport;
  await page.routeWebSocket('**/ws', ws => { transport = ws; });
  await page.goto('/'); await expect(page.locator('#keyboard button').first()).toBeVisible();
  const timer = setInterval(() => transport?.send(JSON.stringify(current)), 50);
  try {
    await expect(page.locator('#tracking-status')).toHaveText('Camera connected');
    await page.locator('#settings-open').click(); await page.locator('#calibrate').click();
    for (let i=0;i<5;i++) {
      await expect(page.locator('#calibration-info')).toContainText(`${i+1} / 5`, { timeout: 5000 });
      const target = await page.locator('#calibration-target').evaluate(element => [parseFloat(element.style.left)/100, parseFloat(element.style.top)/100]);
      current = { type: 'gaze', valid: true, x: target[0]/2+.2, y: target[1]/2+.2 };
    }
    await expect(page.locator('#calibration')).not.toBeVisible({ timeout: 5000 });
    const box = await page.getByRole('button', { name: 'Q', exact: true }).boundingBox();
    current = { type: 'gaze', valid: true, x: ((box.x+box.width/2)/1440)/2+.2, y: ((box.y+box.height/2)/1600)/2+.2 };
    await expect(page.getByRole('button', { name: 'Q', exact: true })).toHaveClass(/dwell-target/);
    await page.waitForTimeout(500);
    current = { type: 'gaze', valid: false };
    await page.waitForTimeout(1400);
    await expect(page.locator('#message')).toHaveValue('');
    await expect(page.locator('.dwell-target')).toHaveCount(0);
  } finally { clearInterval(timer); }
});
