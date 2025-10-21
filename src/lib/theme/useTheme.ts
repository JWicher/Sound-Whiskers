'use client';

import { useContext } from 'react';
import { AppThemeContext } from './ThemeProvider';

export function useTheme() {
    const context = useContext(AppThemeContext);
    
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    
    return context;
}

