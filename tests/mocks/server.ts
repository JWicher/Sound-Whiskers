import { setupServer } from 'msw/node'
import { handlers } from './handlers'

/**
 * Mock Service Worker server for Node.js environment (tests)
 */
export const server = setupServer(...handlers)

