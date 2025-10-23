'use client';

import { ThemeSelector } from '@/components/ui/theme-selector';
import { AuthHeaderActions } from '@/components/auth/AuthHeaderActions';

export function AppHeader() {
    return (
        <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container flex h-14 max-w-screen-2xl items-center justify-between px-4 sm:px-6 lg:px-8">
                <div className="flex items-center gap-2">
                    <h1 className="text-lg font-semibold">Sound Whiskers</h1>
                </div>

                <div className="flex items-center gap-2">
                    <AuthHeaderActions />
                    <ThemeSelector />
                </div>
            </div>
        </header>
    );
}

