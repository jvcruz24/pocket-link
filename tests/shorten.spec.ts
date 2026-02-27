import { test, expect } from '@playwright/test';

test.describe('URL Shortener Flow', () => {
  test('should shorten a URL and copy it to clipboard', async ({
    page,
    context,
    browserName,
  }) => {
    // 1. Grant permissions ONLY for Chromium
    if (browserName === 'chromium') {
      await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    }

    await page.goto('http://localhost:3000');

    // ... (Your existing code to fill input and click shorten)
    const input = page.getByPlaceholder('Insert the URL here to shorten it');
    await input.fill('https://google.com');
    await page.getByRole('button', { name: /shorten url/i }).click();

    const resultLink = page.locator('a.underline');
    const expectedShortLink = await resultLink.innerText(); // e.g., "http://localhost:3000/VVm3sY"

    // 2. Test the Copy Button
    const copyButton = page.getByTitle('Copy to clipboard');
    await copyButton.click();

    // 3. Verify visual feedback (This works on ALL browsers)
    const checkIcon = page.locator('.text-green-500');
    await expect(checkIcon).toBeVisible();

    // 4. Verify Clipboard Content (Logic varies by browser)
    if (browserName === 'chromium') {
      // Real clipboard check
      const clipboardText = await page.evaluate(() =>
        navigator.clipboard.readText(),
      );
      expect(clipboardText).toContain(expectedShortLink);
    } else {
      // For Firefox/WebKit: We rely on the UI state (Check icon)
      // OR you can mock the clipboard API (see below)
      console.log(
        `Skipping real clipboard read on ${browserName} due to browser engine limitations.`,
      );
    }
  });
});
