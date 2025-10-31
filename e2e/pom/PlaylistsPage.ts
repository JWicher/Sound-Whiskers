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

  // Dialog elements
  readonly createDialogTitle: Locator
  readonly playlistNameInput: Locator
  readonly playlistDescriptionInput: Locator
  readonly submitCreateButton: Locator
  readonly cancelCreateButton: Locator

  constructor(page: Page) {
    this.page = page
    this.heading = page.getByRole('heading', { name: /my playlists/i })
    this.createPlaylistButton = page.getByRole('button', { name: /create playlist/i })
    this.refreshButton = page.getByRole('button', { name: /refresh/i })
    this.searchInput = page.getByPlaceholder(/search playlists/i)
    this.sortByRecentlyUpdatedButton = page.getByRole('button', { name: /recently updated/i })
    this.sortByNameButton = page.getByRole('button', { name: /name a-z/i })
    this.sortByRecentlyCreatedButton = page.getByRole('button', { name: /recently created/i })

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
   */
  getSuccessToast() {
    return this.page.getByText(/playlist created successfully/i)
  }

  /**
   * Get error toast message
   */
  getErrorToast() {
    return this.page.getByText(/failed to create playlist/i)
  }
}

