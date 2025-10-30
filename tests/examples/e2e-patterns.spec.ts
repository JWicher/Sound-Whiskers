import { test, expect, Page } from '@playwright/test'

/**
 * Advanced E2E testing patterns with Playwright
 * Demonstrates best practices and common patterns
 */

// Example: Using test fixtures
test.describe('Advanced Playwright Patterns', () => {
  test.beforeEach(async ({ page }) => {
    // Setup before each test
    await page.goto('/')
  })

  test('should use locators with various strategies', async ({ page }) => {
    // By role (preferred - accessibility-friendly)
    const button = page.getByRole('button', { name: /click me/i })
    
    // By label
    const input = page.getByLabel('Email')
    
    // By placeholder
    const search = page.getByPlaceholder('Search...')
    
    // By test ID (add data-testid="..." to elements)
    const element = page.getByTestId('custom-element')
    
    // By text
    const text = page.getByText('Hello World')
    
    // Chaining locators
    const nested = page.locator('.container').getByRole('button')
    
    // Examples (not actually running, just demonstrating syntax)
    expect(button).toBeDefined()
    expect(input).toBeDefined()
    expect(search).toBeDefined()
    expect(element).toBeDefined()
    expect(text).toBeDefined()
    expect(nested).toBeDefined()
  })

  test('should handle user interactions', async ({ page }) => {
    // Click
    // await page.getByRole('button').click()
    
    // Double click
    // await page.getByRole('button').dblclick()
    
    // Fill input
    // await page.getByLabel('Email').fill('test@example.com')
    
    // Type with delay (simulates real typing)
    // await page.getByLabel('Email').pressSequentially('test@example.com', { delay: 100 })
    
    // Select option
    // await page.getByLabel('Country').selectOption('Poland')
    
    // Check/uncheck checkbox
    // await page.getByLabel('Accept terms').check()
    // await page.getByLabel('Newsletter').uncheck()
    
    // Hover
    // await page.getByRole('button').hover()
    
    // Press keyboard keys
    // await page.keyboard.press('Enter')
    // await page.keyboard.type('Hello')
    
    expect(true).toBe(true) // Placeholder
  })

  test('should wait for elements and conditions', async ({ page }) => {
    // Wait for element to be visible
    // await page.getByRole('button').waitFor({ state: 'visible' })
    
    // Wait for element to be hidden
    // await page.getByRole('loading').waitFor({ state: 'hidden' })
    
    // Wait for navigation
    // await page.waitForURL('**/dashboard')
    
    // Wait for response
    // await page.waitForResponse(response => 
    //   response.url().includes('/api/data') && response.status() === 200
    // )
    
    // Wait for function
    // await page.waitForFunction(() => window.innerWidth < 600)
    
    // Custom timeout
    // await page.getByRole('button').click({ timeout: 10000 })
    
    expect(true).toBe(true) // Placeholder
  })

  test('should handle API mocking', async ({ page }) => {
    // Mock API response
    await page.route('**/api/playlists', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [
            { id: '1', name: 'Mocked Playlist', track_count: 10 }
          ]
        })
      })
    })
    
    // Navigate and verify mocked data is used
    await page.goto('/')
    
    expect(true).toBe(true)
  })

  test('should handle multiple pages/tabs', async ({ context }) => {
    // Open new page
    const newPage = await context.newPage()
    await newPage.goto('/')
    
    // Work with multiple pages
    const pages = context.pages()
    expect(pages.length).toBeGreaterThan(0)
    
    await newPage.close()
  })

  test('should take screenshots', async ({ page }) => {
    // Full page screenshot
    await page.screenshot({ path: 'test-results/full-page.png', fullPage: true })
    
    // Element screenshot
    // await page.getByRole('button').screenshot({ path: 'button.png' })
    
    // Screenshot on failure (automatic with config)
    expect(true).toBe(true)
  })

  test('should handle dialogs', async ({ page }) => {
    // Handle alert/confirm/prompt
    page.on('dialog', async dialog => {
      expect(dialog.type()).toBe('alert')
      await dialog.accept()
    })
    
    // Trigger dialog (example)
    // await page.getByRole('button', { name: 'Delete' }).click()
    
    expect(true).toBe(true)
  })

  test('should handle file uploads', async ({ page }) => {
    // Upload single file
    // await page.getByLabel('Upload').setInputFiles('path/to/file.png')
    
    // Upload multiple files
    // await page.getByLabel('Upload').setInputFiles([
    //   'file1.png',
    //   'file2.png'
    // ])
    
    // Clear file input
    // await page.getByLabel('Upload').setInputFiles([])
    
    expect(true).toBe(true)
  })

  test('should use assertions', async ({ page }) => {
    // Visibility
    // await expect(page.getByRole('button')).toBeVisible()
    // await expect(page.getByRole('loading')).toBeHidden()
    
    // Text content
    // await expect(page.getByRole('heading')).toHaveText('Welcome')
    // await expect(page.getByRole('heading')).toContainText('Wel')
    
    // Attributes
    // await expect(page.getByRole('button')).toHaveAttribute('disabled', '')
    // await expect(page.getByRole('link')).toHaveAttribute('href', '/about')
    
    // Count
    // await expect(page.getByRole('listitem')).toHaveCount(5)
    
    // URL
    await expect(page).toHaveURL('/')
    // await expect(page).toHaveURL(/.*dashboard.*/)
    
    // Title
    // await expect(page).toHaveTitle(/Sound Whiskers/)
    
    // Value (for inputs)
    // await expect(page.getByLabel('Email')).toHaveValue('test@example.com')
  })
})

/**
 * Example: Page Object Model with advanced features
 */
class DashboardPage {
  constructor(private page: Page) {}

  // Locators as getters
  get searchInput() {
    return this.page.getByPlaceholder('Search playlists...')
  }

  get createButton() {
    return this.page.getByRole('button', { name: /create/i })
  }

  // Actions
  async goto() {
    await this.page.goto('/playlists')
  }

  async search(query: string) {
    await this.searchInput.fill(query)
    await this.page.keyboard.press('Enter')
  }

  async createPlaylist(name: string) {
    await this.createButton.click()
    await this.page.getByLabel('Name').fill(name)
    await this.page.getByRole('button', { name: /save/i }).click()
  }

  // Assertions
  async expectPlaylistCount(count: number) {
    await expect(this.page.getByRole('article')).toHaveCount(count)
  }
}

test.describe('Page Object Model Example', () => {
  test('should use POM pattern', async ({ page }) => {
    const dashboard = new DashboardPage(page)
    
    await dashboard.goto()
    // await dashboard.search('rock')
    // await dashboard.expectPlaylistCount(5)
    
    expect(true).toBe(true)
  })
})

/**
 * Example: Test hooks and setup
 */
test.describe('Test Hooks', () => {
  test.beforeAll(async () => {
    // Runs once before all tests in this describe block
  })

  test.beforeEach(async ({ page }) => {
    // Runs before each test
    await page.goto('/')
  })

  test.afterEach(async ({ page }) => {
    // Runs after each test
    // Cleanup, screenshots, etc.
  })

  test.afterAll(async () => {
    // Runs once after all tests in this describe block
  })

  test('example test', () => {
    expect(true).toBe(true)
  })
})

/**
 * Example: Parallel and serial execution
 */
test.describe.configure({ mode: 'parallel' })
test.describe('Parallel Tests', () => {
  test('test 1', async () => {
    expect(true).toBe(true)
  })

  test('test 2', async () => {
    expect(true).toBe(true)
  })
})

test.describe.configure({ mode: 'serial' })
test.describe('Serial Tests', () => {
  test('must run first', async () => {
    expect(true).toBe(true)
  })

  test('must run second', async () => {
    expect(true).toBe(true)
  })
})

/**
 * Example: Conditional tests
 */
test.describe('Conditional Tests', () => {
  test.skip('skip this test', () => {
    // This test will be skipped
  })

  test.only('only run this test', () => {
    // Only this test will run (useful for debugging)
    expect(true).toBe(true)
  })

  const skipOnCI = process.env.CI === 'true'
  test.skip(skipOnCI, 'skip on CI', () => {
    // Conditional skip
  })
})

/**
 * Example: Testing with different viewports
 */
test.describe('Responsive Testing', () => {
  test('should work on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/')
    
    // Test mobile-specific behavior
    expect(true).toBe(true)
  })

  test('should work on tablet', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 })
    await page.goto('/')
    
    // Test tablet-specific behavior
    expect(true).toBe(true)
  })

  test('should work on desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.goto('/')
    
    // Test desktop-specific behavior
    expect(true).toBe(true)
  })
})

