'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Upload } from 'lucide-react';

interface PlaylistHeaderProps {
    playlistName: string | null;
    trackCount: number;
    onExportClick: () => void;
    isLoading: boolean;
    isLoadingTracks: boolean;
    disableExport?: boolean;
}

export function PlaylistHeader({
    playlistName,
    trackCount,
    onExportClick,
    isLoading,
    isLoadingTracks,
    disableExport = false,
}: PlaylistHeaderProps) {
    if (isLoading || !playlistName) {
        return <Skeleton className="h-10 w-full" />;
    }

    const showWarningBadge = trackCount >= 90;

    return (
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold tracking-tight">{playlistName}</h1>
                <Badge
                    variant={showWarningBadge ? 'destructive' : 'secondary'}
                    className="text-sm"
                >
                    {trackCount} / 100
                </Badge>
            </div>
            <Button
                onClick={onExportClick}
                disabled={disableExport || trackCount === 0 || isLoadingTracks}
                size="sm"
            >
                <Upload className="mr-2 h-4 w-4" />
                Export to Spotify
            </Button>
        </div>
    );
}
