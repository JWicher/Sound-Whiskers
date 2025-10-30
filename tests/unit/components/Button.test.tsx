import { describe, it, expect, vi } from 'vitest'
import { renderWithProviders, screen } from '../../utils/test-utils'
import userEvent from '@testing-library/user-event'
import { Button } from '@/components/ui/button'

/**
 * Example component test using React Testing Library
 * Demonstrates component rendering, user interaction, and assertions
 */
describe('Button component', () => {
    it('should render button with text', () => {
        renderWithProviders(<Button>Click me</Button>)

        expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument()
    })

    it('should handle click events', async () => {
        const handleClick = vi.fn()
        const user = userEvent.setup()

        renderWithProviders(<Button onClick={handleClick}>Click me</Button>)

        const button = screen.getByRole('button', { name: /click me/i })
        await user.click(button)

        expect(handleClick).toHaveBeenCalledTimes(1)
    })

    it('should be disabled when disabled prop is true', () => {
        renderWithProviders(<Button disabled>Disabled button</Button>)

        const button = screen.getByRole('button', { name: /disabled button/i })
        expect(button).toBeDisabled()
    })

    it('should apply variant classes correctly', () => {
        const { rerender } = renderWithProviders(<Button variant="default">Default</Button>)
        let button = screen.getByRole('button', { name: /default/i })
        expect(button).toHaveClass('bg-primary')

        rerender(<Button variant="outline">Outline</Button>)
        button = screen.getByRole('button', { name: /outline/i })
        expect(button).toHaveClass('border')
    })

    it('should not call onClick when disabled', async () => {
        const handleClick = vi.fn()
        const user = userEvent.setup()

        renderWithProviders(
            <Button disabled onClick={handleClick}>
                Disabled
            </Button>
        )

        const button = screen.getByRole('button', { name: /disabled/i })
        await user.click(button)

        expect(handleClick).not.toHaveBeenCalled()
    })
})

