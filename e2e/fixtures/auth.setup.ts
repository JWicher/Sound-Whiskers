import { test as base, expect } from '@playwright/test'
import type { Page } from '@playwright/test'

/**
 * Authentication fixture for Playwright tests
 * Provides authenticated user context for e2e tests
 */

export const test = base.extend<{
  authenticatedPage: Page
}>({
  authenticatedPage: async ({ page }, use) => {
    const email = process.env.E2E_USERNAME
    const password = process.env.E2E_PASSWORD

    if (!email || !password) {
      throw new Error('E2E_USERNAME and E2E_PASSWORD must be set in .env.test')
    }

    // Navigate to login page
    await page.goto('/auth/login', { waitUntil: 'networkidle' })

    // Wait for the email field to be visible and ready before interacting
    const emailInput = page.getByRole('textbox', { name: /email/i })
    await emailInput.waitFor({ state: 'visible', timeout: 10000 })

    // Fill in credentials - use more specific selectors to avoid strict mode violations
    await emailInput.fill(email)
    
    // For password input, use placeholder to be more specific than label
    // This avoids conflict with "Show password" button
    await page.getByPlaceholder(/enter your password/i).fill(password)

    // Submit form
    await page.getByRole('button', { name: /sign in/i }).click()

    // Wait for navigation to complete and user to be logged in
    // Increased timeout to handle slow network/auth
    await page.waitForURL('/playlists', { timeout: 15000 })

    // Verify authentication was successful
    await expect(page).toHaveURL('/playlists')

    // Use the authenticated page
    await use(page)
  },
})

export { expect }

