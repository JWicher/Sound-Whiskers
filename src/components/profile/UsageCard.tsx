'use client';

import Link from 'next/link';
import { Calendar, Sparkles, List } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useUsage } from '@/lib/hooks/useUsage';
import { Skeleton } from '@/components/ui/skeleton';

function formatResetDate(resetAt: string): string {
    const date = new Date(resetAt);
    return date.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric'
    });
}

export function UsageCard() {
    const { usage, isLoading } = useUsage();

    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Usage</CardTitle>
                    <CardDescription>Track your resource usage and limits</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Skeleton className="h-16 w-full" />
                    <Separator />
                    <Skeleton className="h-16 w-full" />
                </CardContent>
            </Card>
        );
    }

    if (!usage) {
        return null;
    }

    const playlistsPercentage = usage.playlists.limit === Infinity
        ? 0
        : Math.round((usage.playlists.count / usage.playlists.limit) * 100);

    const aiPercentage = Math.round((usage.ai.used / usage.ai.limit) * 100);
    const isPlaylistsNearLimit = playlistsPercentage >= 80 && usage.playlists.limit !== Infinity;
    const isAiNearLimit = aiPercentage >= 80;

    return (
        <Card>
            <CardHeader>
                <CardTitle>Usage</CardTitle>
                <CardDescription>Track your resource usage and limits</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Playlists Usage */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <Link href="/playlists" className="cursor-pointer">
                            <div className="flex items-center gap-2">
                                <List className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm font-medium">Playlists</span>
                            </div>
                        </Link>
                        <Badge variant={isPlaylistsNearLimit ? 'destructive' : 'secondary'}>
                            {usage.playlists.count} / {usage.playlists.limit === Infinity ? '∞' : usage.playlists.limit}
                        </Badge>
                    </div>
                    {isPlaylistsNearLimit && (
                        <p className="text-xs text-muted-foreground">
                            You&apos;re approaching your playlist limit. Consider upgrading to Pro for unlimited playlists.
                        </p>
                    )}
                </div>

                <Separator />

                {/* AI Usage */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Sparkles className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">AI Generations</span>
                        </div>
                        <Badge variant={isAiNearLimit ? 'destructive' : 'secondary'}>
                            {usage.ai.remaining} left
                        </Badge>
                    </div>
                    <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">
                            Used {usage.ai.used} of {usage.ai.limit} this month
                        </p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            <span>Resets on {formatResetDate(usage.ai.resetAt)}</span>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

