import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    // Environment
    environment: 'jsdom',
    
    // Setup files
    setupFiles: ['./vitest.setup.ts'],
    
    // Globals (optional - allows using describe/it without imports)
    globals: true,
    
    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'src/db/database.types.ts',
        '**/*.d.ts',
        '**/*.config.*',
        '**/mockData',
        'tests/',
        '.next/',
      ],
      // Thresholds - enforce only when explicitly requested
      // thresholds: {
      //   lines: 80,
      //   functions: 80,
      //   branches: 80,
      //   statements: 80,
      // },
    },
    
    // Include test files
    include: ['**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    
    // Exclude
    exclude: [
      'node_modules',
      '.next',
      'dist',
      'build',
      'e2e',
      'tests/examples/e2e-patterns.spec.ts',
    ],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})

