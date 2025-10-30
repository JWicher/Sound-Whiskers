import { test as base, expect } from '@playwright/test'
import type { Page } from '@playwright/test'

/**
 * Authentication fixture for Playwright tests
 * Extend this with authenticated user setup if needed
 */

export const test = base.extend<{
  authenticatedPage: Page
}>({
  authenticatedPage: async ({ page }, use) => {
    // TODO: Add authentication logic here
    // For now, just use the regular page
    await use(page)
  },
})

export { expect }

