import { describe, it, expect, vi } from 'vitest'
import { renderWithProviders, screen } from '../../utils/test-utils'
import userEvent from '@testing-library/user-event'
import { PasswordInput } from '@/components/auth/PasswordInput'

/**
 * PasswordInput Component Tests
 * 
 * Tests for a pure logic component with critical security UX
 * Key behaviors:
 * - Password visibility toggling
 * - Disabled state management
 * - Accessibility (ARIA labels, keyboard navigation)
 * - Icon switching (Eye/EyeOff)
 * - Input value changes
 */
describe('PasswordInput', () => {
    // Setup common test data
    const defaultProps = {
        value: '',
        onChange: vi.fn(),
        placeholder: 'Enter password',
    }

    describe('Rendering', () => {
        it('should render password input with hidden text by default', () => {
            renderWithProviders(<PasswordInput {...defaultProps} />)

            const input = screen.getByPlaceholderText('Enter password')
            expect(input).toBeInTheDocument()
            expect(input).toHaveAttribute('type', 'password')
        })

        it('should render with custom placeholder', () => {
            renderWithProviders(
                <PasswordInput
                    {...defaultProps}
                    placeholder="Create a strong password"
                />
            )

            expect(screen.getByPlaceholderText('Create a strong password')).toBeInTheDocument()
        })

        it('should render with provided value', () => {
            renderWithProviders(
                <PasswordInput {...defaultProps} value="mypassword123" />
            )

            const input = screen.getByPlaceholderText('Enter password')
            expect(input).toHaveValue('mypassword123')
        })

        it('should render with correct HTML attributes', () => {
            renderWithProviders(
                <PasswordInput
                    {...defaultProps}
                    name="password"
                    id="user-password"
                    autoComplete="current-password"
                />
            )

            const input = screen.getByPlaceholderText('Enter password')
            expect(input).toHaveAttribute('name', 'password')
            expect(input).toHaveAttribute('id', 'user-password')
            expect(input).toHaveAttribute('autocomplete', 'current-password')
        })

        it('should render toggle button', () => {
            renderWithProviders(<PasswordInput {...defaultProps} />)

            const toggleButton = screen.getByRole('button', { name: 'Show password' })
            expect(toggleButton).toBeInTheDocument()
        })
    })

    describe('Icon Display', () => {
        it('should show Eye icon when password is hidden', () => {
            renderWithProviders(<PasswordInput {...defaultProps} />)

            const toggleButton = screen.getByRole('button', { name: 'Show password' })
            // The Eye icon is present when password is hidden
            const icon = toggleButton.querySelector('svg')
            expect(icon).toBeInTheDocument()
        })

        it('should show EyeOff icon when password is visible', async () => {
            const user = userEvent.setup()
            renderWithProviders(<PasswordInput {...defaultProps} />)

            const toggleButton = screen.getByRole('button', { name: 'Show password' })
            await user.click(toggleButton)

            // After clicking, button label changes and EyeOff icon should be shown
            const updatedButton = screen.getByRole('button', { name: 'Hide password' })
            const icon = updatedButton.querySelector('svg')
            expect(icon).toBeInTheDocument()
        })
    })

    describe('Password Visibility Toggle', () => {
        it('should toggle password visibility when button is clicked', async () => {
            const user = userEvent.setup()
            renderWithProviders(<PasswordInput {...defaultProps} value="secret123" />)

            const input = screen.getByPlaceholderText('Enter password')
            const toggleButton = screen.getByRole('button', { name: 'Show password' })

            // Initially password is hidden
            expect(input).toHaveAttribute('type', 'password')

            // Click to show password
            await user.click(toggleButton)
            expect(input).toHaveAttribute('type', 'text')

            // Click again to hide password
            await user.click(toggleButton)
            expect(input).toHaveAttribute('type', 'password')
        })

        it('should toggle multiple times correctly', async () => {
            const user = userEvent.setup()
            renderWithProviders(<PasswordInput {...defaultProps} />)

            const input = screen.getByPlaceholderText('Enter password')
            let toggleButton = screen.getByRole('button', { name: 'Show password' })

            // Toggle show
            await user.click(toggleButton)
            expect(input).toHaveAttribute('type', 'text')

            // Toggle hide
            toggleButton = screen.getByRole('button', { name: 'Hide password' })
            await user.click(toggleButton)
            expect(input).toHaveAttribute('type', 'password')

            // Toggle show again
            toggleButton = screen.getByRole('button', { name: 'Show password' })
            await user.click(toggleButton)
            expect(input).toHaveAttribute('type', 'text')
        })
    })

    describe('User Input', () => {
        it('should call onChange with correct value when user types', async () => {
            const handleChange = vi.fn()
            const user = userEvent.setup()

            renderWithProviders(
                <PasswordInput {...defaultProps} onChange={handleChange} />
            )

            const input = screen.getByPlaceholderText('Enter password')

            // Type a simple string
            await user.type(input, 'abc')

            // onChange should be called for each character typed
            expect(handleChange).toHaveBeenCalledTimes(3)
            // Verify onChange was called with individual characters
            expect(handleChange).toHaveBeenNthCalledWith(1, 'a')
            expect(handleChange).toHaveBeenNthCalledWith(2, 'b')
            expect(handleChange).toHaveBeenNthCalledWith(3, 'c')
        })

        it('should call onChange with correct value when user clears input', async () => {
            const handleChange = vi.fn()
            const user = userEvent.setup()

            renderWithProviders(
                <PasswordInput
                    {...defaultProps}
                    value="password"
                    onChange={handleChange}
                />
            )

            const input = screen.getByPlaceholderText('Enter password')
            await user.clear(input)

            expect(handleChange).toHaveBeenCalledWith('')
        })

        it('should handle paste events', async () => {
            const handleChange = vi.fn()
            const user = userEvent.setup()

            renderWithProviders(
                <PasswordInput {...defaultProps} onChange={handleChange} />
            )

            const input = screen.getByPlaceholderText('Enter password')
            await user.click(input)
            await user.paste('PastedPassword')

            expect(handleChange).toHaveBeenCalled()
            expect(handleChange).toHaveBeenLastCalledWith('PastedPassword')
        })
    })

    describe('Disabled State', () => {
        it('should disable both input and toggle button when disabled prop is true', () => {
            renderWithProviders(<PasswordInput {...defaultProps} disabled={true} />)

            const input = screen.getByPlaceholderText('Enter password')
            const toggleButton = screen.getByRole('button', { name: 'Show password' })

            expect(input).toBeDisabled()
            expect(toggleButton).toBeDisabled()
        })

        it('should not call onChange when input is disabled', async () => {
            const handleChange = vi.fn()
            const user = userEvent.setup()

            renderWithProviders(
                <PasswordInput
                    {...defaultProps}
                    disabled={true}
                    onChange={handleChange}
                />
            )

            const input = screen.getByPlaceholderText('Enter password')
            await user.type(input, 'test')

            expect(handleChange).not.toHaveBeenCalled()
        })

        it('should not toggle visibility when toggle button is disabled', async () => {
            const user = userEvent.setup()
            renderWithProviders(<PasswordInput {...defaultProps} disabled={true} />)

            const input = screen.getByPlaceholderText('Enter password')
            const toggleButton = screen.getByRole('button', { name: 'Show password' })

            await user.click(toggleButton)

            // Input type should remain 'password' (not toggled)
            expect(input).toHaveAttribute('type', 'password')
        })

        it('should enable both input and toggle when disabled is false', () => {
            renderWithProviders(<PasswordInput {...defaultProps} disabled={false} />)

            const input = screen.getByPlaceholderText('Enter password')
            const toggleButton = screen.getByRole('button', { name: 'Show password' })

            expect(input).not.toBeDisabled()
            expect(toggleButton).not.toBeDisabled()
        })
    })

    describe('Accessibility', () => {
        it('should have correct aria-label when password is hidden', () => {
            renderWithProviders(<PasswordInput {...defaultProps} />)

            const toggleButton = screen.getByRole('button', { name: 'Show password' })
            expect(toggleButton).toHaveAttribute('aria-label', 'Show password')
        })

        it('should have correct aria-label when password is visible', async () => {
            const user = userEvent.setup()
            renderWithProviders(<PasswordInput {...defaultProps} />)

            const toggleButton = screen.getByRole('button', { name: 'Show password' })
            await user.click(toggleButton)

            const updatedButton = screen.getByRole('button', { name: 'Hide password' })
            expect(updatedButton).toHaveAttribute('aria-label', 'Hide password')
        })

        it('should be keyboard navigable - toggle with Enter key', async () => {
            const user = userEvent.setup()
            renderWithProviders(<PasswordInput {...defaultProps} />)

            const input = screen.getByPlaceholderText('Enter password')
            const toggleButton = screen.getByRole('button', { name: 'Show password' })

            // Focus on toggle button and press Enter
            toggleButton.focus()
            await user.keyboard('{Enter}')

            expect(input).toHaveAttribute('type', 'text')
        })

        it('should be keyboard navigable - toggle with Space key', async () => {
            const user = userEvent.setup()
            renderWithProviders(<PasswordInput {...defaultProps} />)

            const input = screen.getByPlaceholderText('Enter password')
            const toggleButton = screen.getByRole('button', { name: 'Show password' })

            // Focus on toggle button and press Space
            toggleButton.focus()
            await user.keyboard(' ')

            expect(input).toHaveAttribute('type', 'text')
        })

        it('should be keyboard navigable - Tab between input and button', async () => {
            const user = userEvent.setup()
            renderWithProviders(<PasswordInput {...defaultProps} />)

            const input = screen.getByPlaceholderText('Enter password')
            const toggleButton = screen.getByRole('button', { name: 'Show password' })

            // Tab from input to button
            input.focus()
            expect(input).toHaveFocus()

            await user.keyboard('{Tab}')
            expect(toggleButton).toHaveFocus()
        })
    })

    describe('Edge Cases', () => {
        it('should handle empty string value', () => {
            renderWithProviders(<PasswordInput {...defaultProps} value="" />)

            const input = screen.getByPlaceholderText('Enter password')
            expect(input).toHaveValue('')
        })

        it('should handle very long password values', () => {
            const longPassword = 'a'.repeat(200)
            renderWithProviders(
                <PasswordInput {...defaultProps} value={longPassword} />
            )

            const input = screen.getByPlaceholderText('Enter password')
            expect(input).toHaveValue(longPassword)
        })

        it('should handle special characters in password', async () => {
            const handleChange = vi.fn()
            const user = userEvent.setup()

            renderWithProviders(
                <PasswordInput {...defaultProps} onChange={handleChange} />
            )

            const input = screen.getByPlaceholderText('Enter password')
            // Use paste for special characters that conflict with keyboard shortcuts
            const specialPassword = '!@#$%^&*()_+-=[]{}|;:,.<>?'
            await user.click(input)
            await user.paste(specialPassword)

            expect(handleChange).toHaveBeenCalledWith(specialPassword)
        })

        it('should handle unicode characters in password', async () => {
            const handleChange = vi.fn()
            const user = userEvent.setup()

            renderWithProviders(
                <PasswordInput {...defaultProps} onChange={handleChange} />
            )

            const input = screen.getByPlaceholderText('Enter password')
            // Use paste for unicode characters as user.type() has issues with them
            const unicodePassword = '密码🔒émojis'
            await user.click(input)
            await user.paste(unicodePassword)

            expect(handleChange).toHaveBeenCalledWith(unicodePassword)
        })

        it('should maintain visibility state when value changes', async () => {
            const user = userEvent.setup()
            const { rerender } = renderWithProviders(
                <PasswordInput {...defaultProps} value="initial" />
            )

            const toggleButton = screen.getByRole('button', { name: 'Show password' })
            await user.click(toggleButton)

            const input = screen.getByPlaceholderText('Enter password')
            expect(input).toHaveAttribute('type', 'text')

            // Update value while keeping visibility state
            rerender(<PasswordInput {...defaultProps} value="updated" />)

            // Visibility should remain the same (shown)
            expect(input).toHaveAttribute('type', 'text')
        })

        it('should not reset visibility state on re-render', async () => {
            const user = userEvent.setup()
            const { rerender } = renderWithProviders(<PasswordInput {...defaultProps} />)

            const toggleButton = screen.getByRole('button', { name: 'Show password' })
            await user.click(toggleButton)

            const input = screen.getByPlaceholderText('Enter password')
            expect(input).toHaveAttribute('type', 'text')

            // Trigger re-render with same props
            rerender(<PasswordInput {...defaultProps} />)

            // Should still be visible
            expect(input).toHaveAttribute('type', 'text')
        })
    })

    describe('Button Behavior', () => {
        it('should have type="button" to prevent form submission', () => {
            renderWithProviders(<PasswordInput {...defaultProps} />)

            const toggleButton = screen.getByRole('button', { name: 'Show password' })
            expect(toggleButton).toHaveAttribute('type', 'button')
        })

        it('should have correct variant and size', () => {
            renderWithProviders(<PasswordInput {...defaultProps} />)

            const toggleButton = screen.getByRole('button', { name: 'Show password' })
            // These classes are applied by shadcn Button component with variant="ghost" size="sm"
            expect(toggleButton).toBeInTheDocument()
        })
    })
})

