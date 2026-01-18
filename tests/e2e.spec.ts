import { test, expect } from '@playwright/test';

test.describe('en:gram E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display the main page with header and note input', async ({ page }) => {
    // Increase timeout for initial load in slow environments
    test.setTimeout(60000);
    await expect(page.getByRole('heading', { name: 'en:gram', exact: true })).toBeVisible();
    // Wait for the note input to be attached to the DOM
    await page.getByPlaceholder('Write your thoughts, or attach a file...').waitFor({ state: 'attached' });
    await expect(page.getByPlaceholder('Write your thoughts, or attach a file...')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Add Note' })).toBeVisible();
  });

  test('should add a new text note', async ({ page }) => {
    const noteContent = `This is a test note added at ${new Date().toISOString()}`;
    await page.getByPlaceholder('Write your thoughts, or attach a file...').fill(noteContent);
    await expect(page.getByRole('button', { name: 'Add Note' })).toBeEnabled();
    await page.getByRole('button', { name: 'Add Note' }).click();

    // Wait for the note to be saved to IndexedDB (NoteInput does not await the parent handler)
    await page.waitForTimeout(1000);

    // Open Side Nav
    await page.getByRole('button', { name: 'menu' }).click();

    // Navigate to the notes page to verify the note was added
    await page.getByRole('button', { name: 'Notes' }).click();

    // Wait for the note list to load
    await page.waitForTimeout(1000);

    // Use a more flexible locator in case of formatting
    await expect(page.locator('.note-card-content')).toContainText(noteContent);
  });

  test('should ask a question to Engrammer and get a response', async ({ page }) => {
    // Mock the Engrammer API calls
    await page.route('**/*engrammerFlow_start*', async route => {
      const requestData = route.request().postDataJSON();
      // Use the threadId from the request if available, otherwise default to test-thread-123
      const threadId = requestData?.data?.threadId || 'test-thread-123';
      const json = { data: { threadId } };
      await route.fulfill({ json, contentType: 'application/json' });
    });

    await page.route('**/*getEngrammerState*', async route => {
      // We need to match the threadId used in start
      // Since we can't easily share state between routes without a variable,
      // we'll extract it from the request if possible, or just return a response
      // that matches the ID we expect the frontend to be polling for.
      // However, the frontend polling loop uses the ID returned by start.
      // So if start returns the ID sent by frontend, the polling will use that ID.

      const requestData = route.request().postDataJSON();
      const threadId = requestData?.data?.threadId || 'test-thread-123';

      const json = {
        data: {
          status: 'done',
          latestResponse: 'This is a mocked response from Engrammer.',
          pendingInsights: [],
          references: [],
          error: null,
          threadId: threadId
        }
      };
      await route.fulfill({ json, contentType: 'application/json' });
    });

    const question = 'What is the meaning of life?';
    await page.getByPlaceholder('Ask Engrammer a question...').fill(question);
    await page.getByRole('button', { name: 'Ask Engrammer' }).click();

    // Wait for the response to appear
    const responseArea = page.locator('.engrammer-response-area');
    await expect(responseArea).toContainText(/This is a mocked response from Engrammer./i, { timeout: 10000 });
  });
});
