# Testing Guide

This project uses a comprehensive testing setup with Vitest for unit/integration tests and Playwright for E2E tests.

## 📁 Project Structure

```
├── tests/
│   ├── unit/              # Unit tests
│   ├── integration/       # Integration tests
│   ├── mocks/            # MSW handlers and server setup
│   └── utils/            # Test utilities and helpers
├── e2e/
│   ├── pom/              # Page Object Models
│   ├── fixtures/         # Test fixtures and setup
│   └── *.spec.ts         # E2E test files
├── vitest.config.ts      # Vitest configuration
├── vitest.setup.ts       # Vitest setup file
└── playwright.config.ts  # Playwright configuration
```

## 🧪 Unit & Integration Tests (Vitest)

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with UI
npm run test:ui

# Run tests with coverage
npm run test:coverage
```

### Writing Unit Tests

Unit tests should be placed in `tests/unit/` directory with `.test.ts` or `.test.tsx` extension.

Example:
```typescript
import { describe, it, expect } from 'vitest'

describe('MyFunction', () => {
  it('should do something', () => {
    expect(true).toBe(true)
  })
})
```

### Testing React Components

Use the custom `renderWithProviders` function from `tests/utils/test-utils.tsx`:

```typescript
import { renderWithProviders, screen } from '@/tests/utils/test-utils'
import { Button } from '@/components/ui/button'

it('should render button', () => {
  renderWithProviders(<Button>Click me</Button>)
  expect(screen.getByRole('button')).toBeInTheDocument()
})
```

### Mocking with Vitest

```typescript
import { vi } from 'vitest'

// Mock a function
const mockFn = vi.fn()

// Mock a module
vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => ({ /* mock implementation */ }))
}))

// Spy on existing function
const spy = vi.spyOn(object, 'method')
```

## 🎭 E2E Tests (Playwright)

### Running E2E Tests

```bash
# Install Playwright browsers (first time only)
npm run playwright:install

# Run E2E tests
npm run test:e2e

# Run E2E tests with UI
npm run test:e2e:ui

# Run E2E tests in headed mode (see browser)
npm run test:e2e:headed

# Debug E2E tests
npm run test:e2e:debug

# Generate tests with codegen
npm run playwright:codegen
```

### Writing E2E Tests

E2E tests should be placed in `e2e/` directory with `.spec.ts` extension.

Use Page Object Model pattern for better maintainability:

```typescript
import { test, expect } from '@playwright/test'
import { HomePage } from './pom/HomePage'

test('should navigate home page', async ({ page }) => {
  const homePage = new HomePage(page)
  await homePage.goto()
  
  await expect(homePage.heading).toBeVisible()
})
```

### Creating Page Objects

Create page objects in `e2e/pom/` directory:

```typescript
import { Page, Locator } from '@playwright/test'

export class MyPage {
  readonly page: Page
  readonly button: Locator

  constructor(page: Page) {
    this.page = page
    this.button = page.getByRole('button', { name: /click me/i })
  }

  async goto() {
    await this.page.goto('/my-page')
  }

  async clickButton() {
    await this.button.click()
  }
}
```

## 🔍 API Mocking (MSW)

Mock Service Worker is configured for API mocking in tests.

### Adding API Mocks

Edit `tests/mocks/handlers.ts`:

```typescript
import { http, HttpResponse } from 'msw'

export const handlers = [
  http.get('/api/playlists', () => {
    return HttpResponse.json({ data: [] })
  }),
]
```

## ♿ Accessibility Testing

Accessibility tests use axe-core integration with Playwright:

```typescript
import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

test('should not have accessibility violations', async ({ page }) => {
  await page.goto('/')
  
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa'])
    .analyze()
  
  expect(results.violations).toEqual([])
})
```

## 📊 Coverage

Coverage is configured for Vitest and includes:
- Line coverage
- Function coverage
- Branch coverage
- Statement coverage

View coverage reports in `coverage/` directory after running `npm run test:coverage`.

## 🎯 Best Practices

### Vitest
- Use `describe` blocks to group related tests
- Use descriptive test names
- Follow Arrange-Act-Assert pattern
- Use `vi.fn()` for function mocks
- Use `vi.spyOn()` to monitor existing functions
- Leverage inline snapshots for readable assertions
- Clean up mocks in `afterEach` hooks

### Playwright
- Use Page Object Model for maintainability
- Use locators for resilient element selection
- Implement proper test hooks for setup/teardown
- Use specific matchers (toBeVisible, toHaveText, etc.)
- Leverage parallel execution for faster runs
- Use trace viewer for debugging failures
- Capture screenshots on failure

## 🐛 Debugging

### Vitest
- Use `test.only()` to run a single test
- Use `console.log()` for debugging
- Use Vitest UI mode for visual debugging

### Playwright
- Use `--headed` flag to see browser
- Use `--debug` flag for step-by-step debugging
- Use `page.pause()` in tests for manual inspection
- Check trace files in `test-results/` directory

## 📚 Resources

- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
- [Playwright Documentation](https://playwright.dev/)
- [MSW Documentation](https://mswjs.io/)
- [axe-core Documentation](https://github.com/dequelabs/axe-core)

