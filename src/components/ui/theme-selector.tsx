/**
 * Theme Selector Component
 * 
 * A simple button to toggle between light and dark mode.
 */

'use client';

import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/lib/theme/useTheme';

export function ThemeSelector() {
    const { mode, toggleMode } = useTheme();

    return (
        <Button
            variant="outline"
            size="icon"
            onClick={toggleMode}
            aria-label={`Switch to ${mode === 'light' ? 'dark' : 'light'} mode`}
        >
            {mode === 'light' ? (
                <Moon className="h-4 w-4" />
            ) : (
                <Sun className="h-4 w-4" />
            )}
        </Button>
    );
}
