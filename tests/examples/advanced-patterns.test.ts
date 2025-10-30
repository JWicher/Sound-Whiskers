import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

/**
 * Advanced testing patterns and best practices
 * This file demonstrates various testing techniques with Vitest
 */

describe('Advanced Vitest Patterns', () => {
  describe('Mocking with vi.fn()', () => {
    it('should track function calls', () => {
      const mockFn = vi.fn()
      
      mockFn('arg1', 'arg2')
      mockFn('arg3')
      
      expect(mockFn).toHaveBeenCalledTimes(2)
      expect(mockFn).toHaveBeenCalledWith('arg1', 'arg2')
      expect(mockFn).toHaveBeenLastCalledWith('arg3')
    })

    it('should use mockReturnValue for consistent returns', () => {
      const mockFn = vi.fn().mockReturnValue(42)
      
      expect(mockFn()).toBe(42)
      expect(mockFn()).toBe(42)
    })

    it('should use mockReturnValueOnce for sequential returns', () => {
      const mockFn = vi.fn()
        .mockReturnValueOnce('first')
        .mockReturnValueOnce('second')
        .mockReturnValue('default')
      
      expect(mockFn()).toBe('first')
      expect(mockFn()).toBe('second')
      expect(mockFn()).toBe('default')
      expect(mockFn()).toBe('default')
    })

    it('should use mockImplementation for custom logic', () => {
      const mockFn = vi.fn((x: number) => x * 2)
      
      expect(mockFn(5)).toBe(10)
      expect(mockFn(3)).toBe(6)
    })

    it('should use mockResolvedValue for async functions', async () => {
      const mockAsync = vi.fn().mockResolvedValue('success')
      
      const result = await mockAsync()
      expect(result).toBe('success')
    })

    it('should use mockRejectedValue for async errors', async () => {
      const mockAsync = vi.fn().mockRejectedValue(new Error('Failed'))
      
      await expect(mockAsync()).rejects.toThrow('Failed')
    })
  })

  describe('Spying with vi.spyOn()', () => {
    const calculator = {
      add: (a: number, b: number) => a + b,
      multiply: (a: number, b: number) => a * b,
    }

    it('should spy on object methods', () => {
      const addSpy = vi.spyOn(calculator, 'add')
      
      calculator.add(2, 3)
      
      expect(addSpy).toHaveBeenCalledWith(2, 3)
      expect(calculator.add(2, 3)).toBe(5) // Original implementation still works
      
      addSpy.mockRestore()
    })

    it('should spy and mock implementation', () => {
      const multiplySpy = vi.spyOn(calculator, 'multiply')
        .mockImplementation(() => 999)
      
      expect(calculator.multiply(2, 3)).toBe(999)
      
      multiplySpy.mockRestore()
      expect(calculator.multiply(2, 3)).toBe(6) // Back to original
    })
  })

  describe('Testing with timers', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.restoreAllMocks()
    })

    it('should fast-forward timers', () => {
      const callback = vi.fn()
      
      setTimeout(callback, 1000)
      
      expect(callback).not.toHaveBeenCalled()
      
      vi.advanceTimersByTime(1000)
      
      expect(callback).toHaveBeenCalledTimes(1)
    })

    it('should run all timers', () => {
      const callback = vi.fn()
      
      setTimeout(callback, 1000)
      setTimeout(callback, 2000)
      
      vi.runAllTimers()
      
      expect(callback).toHaveBeenCalledTimes(2)
    })
  })

  describe('Testing async code', () => {
    it('should handle promises with async/await', async () => {
      const promise = Promise.resolve('value')
      
      const result = await promise
      expect(result).toBe('value')
    })

    it('should handle rejected promises', async () => {
      const promise = Promise.reject(new Error('Error'))
      
      await expect(promise).rejects.toThrow('Error')
    })

    it('should wait for multiple promises', async () => {
      const promises = [
        Promise.resolve(1),
        Promise.resolve(2),
        Promise.resolve(3),
      ]
      
      const results = await Promise.all(promises)
      expect(results).toEqual([1, 2, 3])
    })
  })

  describe('Snapshot testing', () => {
    it('should match inline snapshot', () => {
      const data = {
        name: 'Test User',
        age: 30,
        active: true,
      }
      
      expect(data).toMatchInlineSnapshot(`
        {
          "active": true,
          "age": 30,
          "name": "Test User",
        }
      `)
    })

    it('should match partial object', () => {
      const user = {
        id: 1,
        name: 'John',
        createdAt: new Date(),
      }
      
      expect(user).toMatchObject({
        id: 1,
        name: 'John',
      })
    })
  })

  describe('Test organization', () => {
    describe('nested describe blocks', () => {
      beforeEach(() => {
        // Setup for this group
      })

      it('keeps tests organized', () => {
        expect(true).toBe(true)
      })

      it('shares beforeEach/afterEach', () => {
        expect(true).toBe(true)
      })
    })
  })

  describe('Custom matchers', () => {
    it('should use toBeCloseTo for floating point', () => {
      expect(0.1 + 0.2).toBeCloseTo(0.3)
    })

    it('should use toContain for arrays', () => {
      expect([1, 2, 3, 4]).toContain(3)
    })

    it('should use toHaveLength', () => {
      expect([1, 2, 3]).toHaveLength(3)
      expect('hello').toHaveLength(5)
    })

    it('should use toBeTruthy/toBeFalsy', () => {
      expect('hello').toBeTruthy()
      expect('').toBeFalsy()
      expect(0).toBeFalsy()
      expect(1).toBeTruthy()
    })
  })
})

/**
 * Example: Testing with dependency injection
 */
class UserService {
  constructor(private api: { fetch: (url: string) => Promise<any> }) {}

  async getUser(id: string) {
    return this.api.fetch(`/users/${id}`)
  }
}

describe('Dependency Injection Pattern', () => {
  it('should inject mock dependencies', async () => {
    const mockApi = {
      fetch: vi.fn().mockResolvedValue({ id: '1', name: 'John' }),
    }
    
    const service = new UserService(mockApi)
    const user = await service.getUser('1')
    
    expect(mockApi.fetch).toHaveBeenCalledWith('/users/1')
    expect(user).toEqual({ id: '1', name: 'John' })
  })
})

