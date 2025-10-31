import { test, expect } from './fixtures/auth.setup'
import { PlaylistsPage } from './pom/PlaylistsPage'

/**
 * E2E tests for Playlists functionality
 * Tests use authenticated user context via auth.setup fixture
 */

test.describe('Playlists Management', () => {
  test.describe('Create Playlist', () => {
    test('should successfully create a new playlist with name only', async ({ authenticatedPage }) => {
      const playlistsPage = new PlaylistsPage(authenticatedPage)
      
      // Wait for page to be fully loaded
      await expect(playlistsPage.heading).toBeVisible()
      
      // Generate unique playlist name to avoid conflicts
      const playlistName = `Test Playlist ${Date.now()}`
      
      // Click create playlist button
      await playlistsPage.clickCreatePlaylist()
      
      // Verify dialog opened
      await expect(playlistsPage.createDialogTitle).toBeVisible()
      
      // Fill in playlist name
      await playlistsPage.fillPlaylistName(playlistName)
      
      // Submit form
      await playlistsPage.submitCreatePlaylistForm()
      
      // Wait for success toast
      await expect(playlistsPage.getSuccessToast()).toBeVisible({ timeout: 15000 })
      
      // Verify dialog closed
      await expect(playlistsPage.createDialogTitle).not.toBeVisible()
      
      // Verify new playlist appears in the list
      await expect(authenticatedPage.getByRole('heading', { name: playlistName, exact: true })).toBeVisible({ timeout: 10000 })
    })

    test('should successfully create a new playlist with name and description', async ({ authenticatedPage }) => {
      const playlistsPage = new PlaylistsPage(authenticatedPage)
      
      // Wait for page to be fully loaded
      await expect(playlistsPage.heading).toBeVisible()
      
      const playlistName = `Test Playlist With Description ${Date.now()}`
      const playlistDescription = 'This is a test playlist created by E2E tests'
      
      // Use the helper method to create playlist
      await playlistsPage.createPlaylist(playlistName, playlistDescription)
      
      // Wait for success toast
      await expect(playlistsPage.getSuccessToast()).toBeVisible({ timeout: 15000 })
      
      // Verify new playlist appears in the list
      await expect(authenticatedPage.getByRole('heading', { name: playlistName, exact: true })).toBeVisible({ timeout: 10000 })
    })

    test('should show validation error for empty playlist name', async ({ authenticatedPage }) => {
      const playlistsPage = new PlaylistsPage(authenticatedPage)
      
      // Wait for page to be fully loaded
      await expect(playlistsPage.heading).toBeVisible()
      
      // Click create playlist button
      await playlistsPage.clickCreatePlaylist()
      
      // Verify dialog opened
      await expect(playlistsPage.createDialogTitle).toBeVisible()
      
      // Leave name empty and try to submit
      await playlistsPage.submitCreatePlaylistForm()
      
      // Verify validation error appears
      await expect(authenticatedPage.getByText(/playlist name is required/i)).toBeVisible()
      
      // Dialog should still be open
      await expect(playlistsPage.createDialogTitle).toBeVisible()
    })

    test('should cancel playlist creation', async ({ authenticatedPage }) => {
      const playlistsPage = new PlaylistsPage(authenticatedPage)
      
      // Wait for page to be fully loaded
      await expect(playlistsPage.heading).toBeVisible()
      
      // Click create playlist button
      await playlistsPage.clickCreatePlaylist()
      
      // Verify dialog opened
      await expect(playlistsPage.createDialogTitle).toBeVisible()
      
      // Fill in some data
      await playlistsPage.fillPlaylistName('Test Playlist To Cancel')
      
      // Cancel
      await playlistsPage.cancelCreatePlaylistForm()
      
      // Verify dialog closed
      await expect(playlistsPage.createDialogTitle).not.toBeVisible()
      
      // Verify playlist was not created
      await expect(authenticatedPage.getByRole('heading', { name: 'Test Playlist To Cancel', exact: true })).not.toBeVisible()
    })

    test('should reset form when reopening after cancel', async ({ authenticatedPage }) => {
      const playlistsPage = new PlaylistsPage(authenticatedPage)
      
      // Wait for page to be fully loaded
      await expect(playlistsPage.heading).toBeVisible()
      
      // Open dialog and fill some data
      await playlistsPage.clickCreatePlaylist()
      await playlistsPage.fillPlaylistName('Data to be cleared')
      await playlistsPage.fillPlaylistDescription('Description to be cleared')
      
      // Cancel
      await playlistsPage.cancelCreatePlaylistForm()
      
      // Reopen dialog
      await playlistsPage.clickCreatePlaylist()
      
      // Verify form is reset
      await expect(playlistsPage.playlistNameInput).toHaveValue('')
      await expect(playlistsPage.playlistDescriptionInput).toHaveValue('')
    })

    test('should handle playlist name with special characters', async ({ authenticatedPage }) => {
      const playlistsPage = new PlaylistsPage(authenticatedPage)
      
      // Wait for page to be fully loaded
      await expect(playlistsPage.heading).toBeVisible()
      
      const playlistName = `Test Playlist 🎵 ${Date.now()}`
      
      await playlistsPage.createPlaylist(playlistName)
      
      // Wait for success toast
      await expect(playlistsPage.getSuccessToast()).toBeVisible({ timeout: 15000 })
      
      // Verify new playlist appears with special characters
      await expect(authenticatedPage.getByRole('heading', { name: playlistName, exact: true })).toBeVisible({ timeout: 10000 })
    })

    test('should search for newly created playlist', async ({ authenticatedPage }) => {
      const playlistsPage = new PlaylistsPage(authenticatedPage)
      
      // Wait for page to be fully loaded
      await expect(playlistsPage.heading).toBeVisible()
      
      const uniqueSearchTerm = `SearchTest${Date.now()}`
      const playlistName = `Playlist ${uniqueSearchTerm}`
      
      // Create playlist
      await playlistsPage.createPlaylist(playlistName)
      
      // Wait for success
      await expect(playlistsPage.getSuccessToast()).toBeVisible({ timeout: 15000 })
      
      // Search for the playlist
      await playlistsPage.searchPlaylists(uniqueSearchTerm)
      
      // Wait for search to complete (debounced - 300ms + buffer)
      await authenticatedPage.waitForTimeout(500)
      
      // Verify playlist is found
      await expect(authenticatedPage.getByRole('heading', { name: playlistName, exact: true })).toBeVisible()
    })

    test('should take a screenshot of create playlist dialog', async ({ authenticatedPage }) => {
      const playlistsPage = new PlaylistsPage(authenticatedPage)
      
      // Wait for page to be fully loaded
      await expect(playlistsPage.heading).toBeVisible()
      
      // Open create playlist dialog
      await playlistsPage.clickCreatePlaylist()
      
      // Wait for dialog to be fully visible
      await expect(playlistsPage.createDialogTitle).toBeVisible()
      
      // Wait for dialog animations to complete and ensure stable state
      await authenticatedPage.waitForTimeout(300)
      
      // Visual regression testing
      await expect(authenticatedPage).toHaveScreenshot('create-playlist-dialog.png', {
        animations: 'disabled',
        // Allow for minor font rendering differences
        maxDiffPixels: 500,
      })
    })
  })

  test.describe('Playlists Page Layout', () => {
    test('should display all main page elements', async ({ authenticatedPage }) => {
      const playlistsPage = new PlaylistsPage(authenticatedPage)
      
      // Wait for page to be fully loaded
      await expect(playlistsPage.heading).toBeVisible()
      
      // Verify all main elements are visible
      await expect(playlistsPage.createPlaylistButton).toBeVisible()
      await expect(playlistsPage.refreshButton).toBeVisible()
      await expect(playlistsPage.searchInput).toBeVisible()
      await expect(playlistsPage.sortByRecentlyUpdatedButton).toBeVisible()
      await expect(playlistsPage.sortByNameButton).toBeVisible()
      await expect(playlistsPage.sortByRecentlyCreatedButton).toBeVisible()
    })

    // Screenshot test removed: Visual regression testing is not suitable for pages with
    // dynamic content that changes between test runs (timestamps, accumulating test data).
    // The playlist page displays dynamically created playlists with unique names and
    // timestamps, making consistent visual snapshots impractical.
  })
})

