# E2E Tests

This directory contains end-to-end tests for the Sound Whiskers application using Playwright.

## Setup

### Prerequisites

1. Node.js installed
2. Dependencies installed (`npm install`)
3. Test database instance configured

### Environment Configuration

1. Copy the example environment file:
```bash
cp env.test.example .env.test
```

2. Edit `.env.test` and fill in your test credentials:
```bash
# Playwright Base URL
PLAYWRIGHT_BASE_URL=http://localhost:3000

# Supabase Test Instance (Cloud)
NEXT_PUBLIC_SUPABASE_URL=your_test_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_test_supabase_anon_key

# E2E Test User Credentials
E2E_USERNAME_ID=your_test_user_id
E2E_USERNAME=your_test_user_email@example.com
E2E_PASSWORD=your_test_user_password
```

**Important:** 
- The `.env.test` file is git-ignored and should never be committed to version control
- Use a separate Supabase test instance, not production!
- See `env.test.example` for detailed setup instructions

### Test User Setup

The tests require a dedicated test user in your test database:

1. Create a user in your test Supabase instance
2. Verify the email address
3. Add the credentials to `.env.test`

## Running Tests

### Run all E2E tests

```bash
npm run test:e2e
```

### Run E2E tests with UI

```bash
npm run test:e2e:ui
```

### Run specific test file

```bash
npx playwright test e2e/playlists.spec.ts
```

### Run tests in debug mode

```bash
npx playwright test --debug
```

### View test report

```bash
npx playwright show-report
```

## Test Structure

### Fixtures

- `fixtures/auth.setup.ts` - Authentication fixture that provides authenticated user context

### Page Object Models (POM)

- `pom/PlaylistsPage.ts` - Page object for playlists page

### Test Files

- `home.spec.ts` - Tests for home page authentication-based redirection
- `playlists.spec.ts` - Tests for playlist management
  - Create playlist with name only
  - Create playlist with name and description
  - Validation tests
  - Cancel dialog tests
  - Search functionality

## Best Practices

### Using Authenticated Tests

Tests that require authentication should use the `authenticatedPage` fixture:

```typescript
import { test, expect } from './fixtures/auth.setup'

test('my authenticated test', async ({ authenticatedPage }) => {
  // User is already logged in
  await authenticatedPage.goto('/playlists')
  // ... rest of test
})
```

### Using Page Object Model

Always use Page Object Model for maintainable tests:

```typescript
import { PlaylistsPage } from './pom/PlaylistsPage'

test('test example', async ({ authenticatedPage }) => {
  const playlistsPage = new PlaylistsPage(authenticatedPage)
  await playlistsPage.goto()
  await playlistsPage.createPlaylist('My Playlist')
  // ... rest of test
})
```

### Generating Unique Test Data

Use timestamps or UUIDs to generate unique test data:

```typescript
const playlistName = `Test Playlist ${Date.now()}`
```

### Visual Regression Testing

Use screenshots for visual regression:

```typescript
await expect(page).toHaveScreenshot('my-screenshot.png', {
  fullPage: true,
})
```

## Debugging

### Playwright Inspector

```bash
npx playwright test --debug
```

### Trace Viewer

Traces are automatically recorded on first retry. View them with:

```bash
npx playwright show-trace trace.zip
```

### Screenshots and Videos

Screenshots and videos are automatically captured on test failure and saved to:
- `test-results/` - Test results and artifacts
- `playwright-report/` - HTML report

## Database Cleanup

The test suite includes an **automatic database cleanup mechanism** that runs after all tests complete.

### How It Works

After all tests finish, the `global-teardown.ts` script automatically:

1. ✅ Deletes all playlist tracks for the test user
2. ✅ Deletes all playlists for the test user
3. ✅ Deletes Spotify tokens for the test user
4. ✅ Deletes AI sessions for the test user (main table + partitions)
5. ⚠️ Attempts to delete the profile (may be restricted by RLS)

### Configuration

The teardown uses these environment variables from `.env.test`:
- `NEXT_PUBLIC_SUPABASE_URL` - Test Supabase instance URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous/public key
- `E2E_USERNAME_ID` - UUID of the test user to clean up

### Viewing Cleanup Results

After running tests, you'll see cleanup statistics in the console:

```
🧹 Starting database cleanup after E2E tests...

🎯 Cleaning up data for user: f5b1b982-49fc-4fd7-8501-80e0e2bb9904

📊 Cleanup Summary:
─────────────────────────────────
   Playlist Tracks: 5
   Playlists:       3
   Spotify Tokens:  1
   AI Sessions:     2
   Profiles:        0
─────────────────────────────────
   Total:           11

✅ Database cleanup completed successfully!
```

### Manual Cleanup

If you need to manually clean up the database, you can run the teardown script directly:

```bash
npx tsx e2e/global-teardown.ts
```

**Note:** This requires `.env.test` to be configured with valid credentials.

### Troubleshooting Cleanup

**Profile not deleted:**
- This is expected behavior if RLS (Row Level Security) is properly configured
- The anonymous key might not have permission to delete user profiles
- This is a security feature and not a problem

**Cleanup fails with permission errors:**
- Verify `NEXT_PUBLIC_SUPABASE_ANON_KEY` is correct in `.env.test`
- Check RLS policies in your test database
- Ensure the test user exists

**No data to clean up:**
- Tests might not be creating persistent data
- Data might be soft-deleted instead of hard-deleted
- Cleanup from previous run was successful

## Configuration

See `playwright.config.ts` for full configuration details.

Key settings:
- Tests run in Chromium only (Desktop Chrome)
- Tests run in parallel by default
- Base URL: `http://localhost:3000` (configurable via `PLAYWRIGHT_BASE_URL`)
- Automatic retry on CI: 2 retries
- Screenshots on failure
- Video recording on failure
- Trace recording on first retry
- **Global teardown** enabled (`e2e/global-teardown.ts`)

## CI/CD

Tests are configured to run in CI environments with:
- Automatic retry (2 retries)
- Sequential execution (workers: 1)
- Test results exported to JSON

## Recent Fixes

### Fixed Issues (2024-10-31)

1. **Strict Mode Violation** - Password field selector
   - Changed from `getByLabel(/password/i)` to `getByPlaceholder(/enter your password/i)`
   - Avoids conflict with "Show password" button

2. **Test Timeouts** - Authentication taking too long
   - Increased global timeout from 30s to 60s
   - Added `waitUntil: 'networkidle'` for login page
   - Increased assertion timeouts to 10-15s

3. **Inconsistent Navigation** - Unnecessary page loads
   - Removed redundant `goto()` calls after authentication
   - Tests now wait for page load instead of navigating

For detailed troubleshooting information, see [TROUBLESHOOTING.md](./TROUBLESHOOTING.md).

## Troubleshooting

### Tests fail with "User not authenticated"

- Verify `.env.test` contains correct credentials
- Ensure test user exists and email is verified
- Check Supabase test instance is accessible

### Tests timeout

- Increase timeout in `playwright.config.ts`
- Check if development server is running
- Verify network connectivity to test database

### Screenshots don't match baseline

- Review visual changes in the report
- Update baselines if changes are intentional:
  ```bash
  npx playwright test --update-snapshots
  ```

### Screenshot tests fail in CI but pass locally

This is a common issue due to environment differences (fonts, rendering, etc.). To fix:

1. **Delete existing baseline screenshots:**
   ```bash
   rm -rf e2e/*.spec.ts-snapshots/
   ```

2. **Regenerate baselines locally:**
   ```bash
   npx playwright test --update-snapshots
   ```

3. **Commit the new baselines:**
   ```bash
   git add e2e/*.spec.ts-snapshots/
   git commit -m "Update screenshot baselines for CI compatibility"
   ```

**Note:** The tests are now configured with:
- `animations: 'disabled'` - Prevents animation timing issues
- `maxDiffPixels` tolerance - Allows minor font rendering differences
- `fullPage: false` for playlists page - Avoids dynamic content height issues

