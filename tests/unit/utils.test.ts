import { describe, it, expect } from 'vitest'
import { cn } from '@/lib/utils'

/**
 * Example unit test for utility functions
 * Demonstrates basic Vitest usage with describe/it/expect
 */
describe('cn utility', () => {
  it('should merge class names correctly', () => {
    const result = cn('text-red-500', 'bg-blue-500')
    expect(result).toContain('text-red-500')
    expect(result).toContain('bg-blue-500')
  })

  it('should handle conditional classes', () => {
    const isActive = true
    const result = cn('base-class', isActive && 'active-class')
    expect(result).toContain('base-class')
    expect(result).toContain('active-class')
  })

  it('should filter out falsy values', () => {
    const result = cn('text-red-500', false && 'hidden', null, undefined, 'bg-blue-500')
    expect(result).toContain('text-red-500')
    expect(result).toContain('bg-blue-500')
    expect(result).not.toContain('hidden')
  })

  it('should handle Tailwind conflicting classes', () => {
    // tailwind-merge should resolve conflicts
    const result = cn('p-4', 'p-8')
    // Should keep only the last padding value
    expect(result).toBe('p-8')
  })
})

