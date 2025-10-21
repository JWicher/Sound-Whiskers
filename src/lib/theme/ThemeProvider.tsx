'use client';

import { createContext, useEffect, useState, ReactNode } from 'react';

type Mode = 'light' | 'dark';

interface ThemeContextType {
    mode: Mode;
    toggleMode: () => void;
    setMode: (mode: Mode) => void;
}

export const AppThemeContext = createContext<ThemeContextType | undefined>(undefined);

const STORAGE_MODE_KEY = 'app-mode';

interface ThemeProviderProps {
    children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
    const [mode, setMode] = useState<Mode>('light');
    const [mounted, setMounted] = useState(false);

    // Load mode from localStorage on mount
    useEffect(() => {
        const savedMode = localStorage.getItem(STORAGE_MODE_KEY) as Mode | null;

        if (savedMode && (savedMode === 'light' || savedMode === 'dark')) {
            setMode(savedMode);
        } else {
            // Check system preference
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            setMode(prefersDark ? 'dark' : 'light');
        }

        setMounted(true);
    }, []);

    // Apply dark mode to document
    useEffect(() => {
        if (!mounted) return;

        const root = document.documentElement;

        // Apply dark mode class
        if (mode === 'dark') {
            root.classList.add('dark');
        } else {
            root.classList.remove('dark');
        }

        // Save to localStorage
        localStorage.setItem(STORAGE_MODE_KEY, mode);
    }, [mode, mounted]);

    const toggleMode = () => {
        setMode(prev => prev === 'light' ? 'dark' : 'light');
    };

    // Prevent flash of unstyled content
    if (!mounted) {
        return null;
    }

    return (
        <AppThemeContext.Provider
            value={{
                mode,
                toggleMode,
                setMode,
            }}
        >
            {children}
        </AppThemeContext.Provider>
    );
}

