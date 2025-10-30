import { test, expect } from '@playwright/test'
import { HomePage } from './pom/HomePage'

/**
 * Example E2E test using Page Object Model
 * Demonstrates Playwright usage with POM pattern
 */

test.describe('Home Page', () => {
  test('should display home page correctly', async ({ page }) => {
    const homePage = new HomePage(page)
    await homePage.goto()

    // Check if heading is visible
    await expect(homePage.heading).toBeVisible()
  })

  test('should navigate to login page', async ({ page }) => {
    const homePage = new HomePage(page)
    await homePage.goto()

    await homePage.clickLogin()
    
    // Verify navigation
    await expect(page).toHaveURL(/.*login/)
  })

  test('should navigate to register page', async ({ page }) => {
    const homePage = new HomePage(page)
    await homePage.goto()

    await homePage.clickRegister()
    
    // Verify navigation
    await expect(page).toHaveURL(/.*register/)
  })

  test('should take a screenshot of home page', async ({ page }) => {
    await page.goto('/')
    
    // Visual regression testing
    await expect(page).toHaveScreenshot('home-page.png', {
      fullPage: true,
      // First run will create the baseline
    })
  })
})

