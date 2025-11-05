'use client';

import type { ReactNode } from 'react';

import { Crown, Plus, Sparkles } from 'lucide-react';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface PlaylistFormTabsProps {
    activeTab: 'manual' | 'ai';
    onTabChange: (tab: 'manual' | 'ai') => void;
    isPro: boolean;
    manualContent: ReactNode;
    aiContent: ReactNode;
}

export function PlaylistFormTabs({
    activeTab,
    onTabChange,
    isPro,
    manualContent,
    aiContent,
}: PlaylistFormTabsProps) {
    return (
        <Tabs
            value={activeTab}
            onValueChange={(value) => onTabChange(value as 'manual' | 'ai')}
            className="w-full"
        >
            <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="manual">
                    <Plus className="mr-2 h-4 w-4" />
                    Manual
                </TabsTrigger>
                <TabsTrigger value="ai">
                    <Sparkles className="mr-2 h-4 w-4" />
                    AI-Powered
                    {isPro && <Crown className="ml-2 h-3 w-3 text-yellow-500" />}
                </TabsTrigger>
            </TabsList>

            <TabsContent value="manual" className="space-y-4 mt-4">
                {manualContent}
            </TabsContent>

            <TabsContent value="ai" className="space-y-4 mt-4">
                {aiContent}
            </TabsContent>
        </Tabs>
    );
}

