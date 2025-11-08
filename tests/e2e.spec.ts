import { test, expect } from '@playwright/test';

test.describe('en:gram E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display the main page with header and note input', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'en:gram' })).toBeVisible();
    await expect(page.getByPlaceholder('Write your thoughts here...')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Add Note' })).toBeVisible();
  });

  test('should add a new text note', async ({ page }) => {
    const noteContent = `This is a test note added at ${new Date().toISOString()}`;
    await page.getByPlaceholder('Write your thoughts here...').fill(noteContent);
    await expect(page.getByRole('button', { name: 'Add Note' })).toBeEnabled(); // <--- ADDED THIS LINE
    await page.getByRole('button', { name: 'Add Note' }).click();

    // Navigate to the notes page to verify the note was added
    await page.getByRole('button', { name: 'Notes' }).click();
    await expect(page.getByText(noteContent)).toBeVisible();
  });

  test('should ask a question to Engrammer and get a response', async ({ page }) => {
    const question = 'What is the meaning of life?';
    await page.getByPlaceholder('Ask Engrammer a question...').fill(question);
    await page.getByRole('button', { name: 'Ask Engrammer' }).click();

    // Wait for the response to appear
    const responseArea = page.locator('.engrammer-response-area');
    await expect(responseArea).toContainText(/response from Engrammer/i, { timeout: 10000 });
  });
});
