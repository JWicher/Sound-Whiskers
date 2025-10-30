import { render, RenderOptions } from '@testing-library/react'
import { ReactElement, ReactNode } from 'react'
import { ThemeProvider } from '@/lib/theme/ThemeProvider'

/**
 * Custom render function that wraps components with necessary providers
 * Usage: import { renderWithProviders } from '@/tests/utils/test-utils'
 */

interface AllTheProvidersProps {
    children: ReactNode
}

function AllTheProviders({ children }: AllTheProvidersProps) {
    return (
        <ThemeProvider defaultTheme="light">
            {children}
        </ThemeProvider>
    )
}

function renderWithProviders(
    ui: ReactElement,
    options?: Omit<RenderOptions, 'wrapper'>
) {
    return render(ui, { wrapper: AllTheProviders, ...options })
}

// Re-export everything from testing-library
export * from '@testing-library/react'
export { renderWithProviders }

