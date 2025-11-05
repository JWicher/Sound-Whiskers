import { Page, Locator } from '@playwright/test'

/**
 * Page Object Model for Playlists Page
 * Implements the Page Object pattern for maintainable E2E tests
 */
export class PlaylistsPage {
  readonly page: Page
  readonly heading: Locator
  readonly createPlaylistButton: Locator
  readonly refreshButton: Locator
  readonly searchInput: Locator
  readonly sortByRecentlyUpdatedButton: Locator
  readonly sortByNameButton: Locator
  readonly sortByRecentlyCreatedButton: Locator

  // Tab elements for deleted/non-deleted playlists
  readonly activePlaylistsTab: Locator
  readonly deletedPlaylistsTab: Locator
  readonly tabsList: Locator

  // Dialog elements
  readonly createDialogTitle: Locator
  readonly playlistNameInput: Locator
  readonly playlistDescriptionInput: Locator
  readonly submitCreateButton: Locator
  readonly cancelCreateButton: Locator

  constructor(page: Page) {
    this.page = page
    this.heading = page.getByRole('heading', { name: /my playlists/i })
    // Use .first() to handle cases where multiple "Create Playlist" buttons exist (toolbar + empty state)
    this.createPlaylistButton = page.getByRole('button', { name: /create playlist/i }).first()
    this.refreshButton = page.getByRole('button', { name: /refresh/i })
    this.searchInput = page.getByPlaceholder(/search playlists/i)
    this.sortByRecentlyUpdatedButton = page.getByRole('button', { name: /recently updated/i })
    this.sortByNameButton = page.getByRole('button', { name: /name a-z/i })
    this.sortByRecentlyCreatedButton = page.getByRole('button', { name: /recently created/i })

    // Tab elements - for switching between active and deleted playlists
    this.tabsList = page.locator('[role="tablist"]')
    this.activePlaylistsTab = page.getByRole('tab', { name: /active playlists/i })
    this.deletedPlaylistsTab = page.getByRole('tab', { name: /deleted playlists|trash/i })

    // Dialog elements (these will be visible only when dialog is open)
    this.createDialogTitle = page.getByRole('heading', { name: /create new playlist/i })
    this.playlistNameInput = page.getByLabel(/playlist name/i)
    this.playlistDescriptionInput = page.getByLabel(/description/i)
    this.submitCreateButton = page.getByRole('dialog').getByRole('button', { name: /create playlist/i })
    this.cancelCreateButton = page.getByRole('dialog').getByRole('button', { name: /cancel/i })
  }

  async goto() {
    await this.page.goto('/playlists')
  }

  async clickCreatePlaylist() {
    await this.createPlaylistButton.click()
  }

  async fillPlaylistName(name: string) {
    await this.playlistNameInput.fill(name)
  }

  async fillPlaylistDescription(description: string) {
    await this.playlistDescriptionInput.fill(description)
  }

  async submitCreatePlaylistForm() {
    await this.submitCreateButton.click()
  }

  async cancelCreatePlaylistForm() {
    await this.cancelCreateButton.click()
  }

  /**
   * Complete workflow for creating a new playlist
   * @param name - Playlist name
   * @param description - Optional playlist description
   */
  async createPlaylist(name: string, description?: string) {
    await this.clickCreatePlaylist()
    await this.fillPlaylistName(name)
    
    if (description) {
      await this.fillPlaylistDescription(description)
    }
    
    await this.submitCreatePlaylistForm()
  }

  /**
   * Search for playlists by query
   * @param query - Search query
   */
  async searchPlaylists(query: string) {
    await this.searchInput.fill(query)
  }

  /**
   * Click on the active playlists tab to show non-deleted playlists
   */
  async clickActivePlaylistsTab() {
    await this.activePlaylistsTab.click()
  }

  /**
   * Click on the deleted playlists tab to show soft-deleted playlists
   */
  async clickDeletedPlaylistsTab() {
    await this.deletedPlaylistsTab.click()
  }

  /**
   * Get the currently selected tab
   */
  async getActiveTab() {
    return await this.page.locator('[role="tab"][aria-selected="true"]').textContent()
  }

  /**
   * Check if active playlists tab is currently selected
   */
  async isActivePlaylistsTabSelected() {
    return await this.activePlaylistsTab.evaluate((el) => el.getAttribute('aria-selected') === 'true')
  }

  /**
   * Check if deleted playlists tab is currently selected
   */
  async isDeletedPlaylistsTabSelected() {
    return await this.deletedPlaylistsTab.evaluate((el) => el.getAttribute('aria-selected') === 'true')
  }

  /**
   * Get playlist card by name
   * @param name - Playlist name
   */
  getPlaylistCard(name: string) {
    return this.page.getByRole('heading', { name, exact: true }).locator('..')
  }

  /**
   * Get all playlist cards
   */
  getAllPlaylistCards() {
    return this.page.locator('[role="article"]') // Assuming cards have article role
  }

  /**
   * Click on a playlist by name to navigate to details
   * @param name - Playlist name
   */
  async clickPlaylist(name: string) {
    await this.page.getByRole('heading', { name, exact: true }).click()
  }

  /**
   * Get success toast message
   *
   * Some UI variants may show either "Playlist created successfully" or
   * "Playlist created". Use a tolerant regex to cover both cases.
   */
  getSuccessToast() {
    // Be lenient about trailing punctuation
    return this.page.getByText(/playlist created(?:\s+successfully)?[.!]?/i)
  }

  /**
   * Get error toast message
   */
  getErrorToast() {
    return this.page.getByText(/failed to create playlist/i)
  }
}

