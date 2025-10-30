import { Page, Locator } from '@playwright/test'

/**
 * Page Object Model for Home Page
 * Implements the Page Object pattern for maintainable E2E tests
 */
export class HomePage {
  readonly page: Page
  readonly heading: Locator
  readonly loginButton: Locator
  readonly registerButton: Locator

  constructor(page: Page) {
    this.page = page
    this.heading = page.getByRole('heading', { name: /sound whiskers/i })
    this.loginButton = page.getByRole('link', { name: /zaloguj/i })
    this.registerButton = page.getByRole('link', { name: /zarejestruj/i })
  }

  async goto() {
    await this.page.goto('/')
  }

  async clickLogin() {
    await this.loginButton.click()
  }

  async clickRegister() {
    await this.registerButton.click()
  }
}

