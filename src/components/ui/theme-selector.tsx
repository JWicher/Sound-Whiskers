/**
 * Theme Selector Component
 * 
 * A dropdown component to switch between available themes.
 * Add this to your header or settings page.
 */

'use client';

import { Moon, Sun, Palette } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useTheme } from '@/lib/theme/useTheme';

export function ThemeSelector() {
    const { currentTheme, mode, switchTheme, toggleMode, availableThemes } = useTheme();

    const themeDisplayNames = {
        groundish: 'Groundish (Earth Tones)',
        neutral: 'Neutral (Default shadcn/ui)',
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                    <Palette className="h-4 w-4 mr-2" />
                    Theme
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Theme Settings</DropdownMenuLabel>
                <DropdownMenuSeparator />

                {/* Color Theme Selection */}
                <DropdownMenuLabel className="text-xs text-muted-foreground">
                    Color Scheme
                </DropdownMenuLabel>
                {availableThemes.map((theme) => (
                    <DropdownMenuItem
                        key={theme}
                        onClick={() => switchTheme(theme)}
                        className={currentTheme === theme ? 'bg-accent' : ''}
                    >
                        <div className="flex items-center">
                            <div
                                className={`w-3 h-3 rounded-full mr-2 ${theme === 'groundish'
                                        ? 'bg-gradient-to-r from-amber-700 to-amber-500'
                                        : 'bg-gradient-to-r from-gray-600 to-gray-400'
                                    }`}
                            />
                            {themeDisplayNames[theme as keyof typeof themeDisplayNames] || theme}
                            {currentTheme === theme && (
                                <span className="ml-auto text-xs">✓</span>
                            )}
                        </div>
                    </DropdownMenuItem>
                ))}

                <DropdownMenuSeparator />

                {/* Dark/Light Mode Toggle */}
                <DropdownMenuItem onClick={toggleMode}>
                    {mode === 'light' ? (
                        <>
                            <Moon className="h-4 w-4 mr-2" />
                            Switch to Dark Mode
                        </>
                    ) : (
                        <>
                            <Sun className="h-4 w-4 mr-2" />
                            Switch to Light Mode
                        </>
                    )}
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
