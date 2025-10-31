import { test, expect } from '@playwright/test'
import { test as authTest } from './fixtures/auth.setup'

/**
 * Home Page E2E Tests
 * Tests the authentication-based redirection logic
 */

test.describe('Home Page', () => {
  test('should redirect unauthenticated users to login page', async ({ page }) => {
    await page.goto('/')
    
    // Should automatically redirect to login
    await expect(page).toHaveURL(/.*\/auth\/login/)
  })
})

test.describe('Home Page - Authenticated', () => {
  authTest('should redirect authenticated users to playlists page', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/')
    
    // Should automatically redirect to playlists
    await expect(authenticatedPage).toHaveURL(/.*\/playlists/)
  })
})

