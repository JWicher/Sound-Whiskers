'use client';

import { useState, useEffect } from 'react';
import type { SpotifyStatusDto, ExportToSpotifyCommand } from '@/types';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, Loader2, LinkIcon, Music } from 'lucide-react';

interface ExportDialogProps {
    playlistId: string;
    playlistName: string;
    trackCount: number;
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    onExportSuccess: () => void;
}

export function ExportDialog({
    playlistId,
    playlistName,
    trackCount,
    isOpen,
    onOpenChange,
    onExportSuccess,
}: ExportDialogProps) {
    const [spotifyStatus, setSpotifyStatus] = useState<SpotifyStatusDto | null>(null);
    const [checkingStatus, setCheckingStatus] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [description, setDescription] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [exportUrl, setExportUrl] = useState<string | null>(null);

    // Check Spotify connection status when dialog opens
    useEffect(() => {
        if (!isOpen) return;

        const checkStatus = async () => {
            setCheckingStatus(true);
            setError(null);
            try {
                const res = await fetch('/api/spotify/status');
                if (!res.ok) {
                    throw new Error('Failed to check Spotify connection');
                }
                const data: SpotifyStatusDto = await res.json();
                setSpotifyStatus(data);
            } catch (e) {
                const message = e instanceof Error ? e.message : 'Failed to check Spotify connection';
                setError(message);
            } finally {
                setCheckingStatus(false);
            }
        };

        checkStatus();
    }, [isOpen]);

    const handleLinkSpotify = () => {
        window.location.href = '/api/spotify/login?returnTo=/playlists/' + playlistId;
    };

    const handleExport = async () => {
        setIsExporting(true);
        setError(null);
        try {
            const command: ExportToSpotifyCommand = {
                description: description.trim() || null,
            };

            const res = await fetch(`/api/playlists/${playlistId}/export/spotify`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(command),
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error.message || 'Failed to export to Spotify');
            }

            const result = await res.json();
            setExportUrl(result.spotifyPlaylistUrl);
            onExportSuccess();

            // Auto-close after 2 seconds
            setTimeout(() => {
                handleClose();
            }, 2000);
        } catch (e) {
            const message = e instanceof Error ? e.message : 'Failed to export to Spotify';
            setError(message);
        } finally {
            setIsExporting(false);
        }
    };

    const handleClose = () => {
        setDescription('');
        setError(null);
        setExportUrl(null);
        setSpotifyStatus(null);
        onOpenChange(false);
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Export to Spotify</DialogTitle>
                    <DialogDescription>
                        Export &quot;{playlistName}&quot; ({trackCount} tracks) to your Spotify account
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    {/* Spotify Status */}
                    {checkingStatus ? (
                        <div className="flex items-center gap-2 text-sm">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Checking Spotify connection...
                        </div>
                    ) : spotifyStatus ? (
                        <div className="space-y-2">
                            <div className="flex items-center gap-2">
                                <Music className="h-4 w-4" />
                                <span className="text-sm font-medium">Spotify Status</span>
                                <Badge variant={spotifyStatus.linked ? 'default' : 'destructive'}>
                                    {spotifyStatus.linked ? 'Connected' : 'Not Connected'}
                                </Badge>
                            </div>
                            {spotifyStatus.expiresAt && (
                                <p className="text-xs text-muted-foreground">
                                    Expires: {new Date(spotifyStatus.expiresAt).toLocaleDateString()}
                                </p>
                            )}
                        </div>
                    ) : null}

                    {/* Not Linked Alert */}
                    {spotifyStatus && !spotifyStatus.linked && (
                        <Alert>
                            <LinkIcon className="h-4 w-4" />
                            <AlertTitle>Spotify Not Connected</AlertTitle>
                            <AlertDescription className="mt-2">
                                You need to connect your Spotify account to export playlists.
                            </AlertDescription>
                        </Alert>
                    )}

                    {/* Error Alert */}
                    {error && (
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}

                    {/* Success Alert */}
                    {exportUrl && (
                        <Alert>
                            <Music className="h-4 w-4" />
                            <AlertTitle>Export Successful!</AlertTitle>
                            <AlertDescription className="mt-2">
                                Your playlist has been exported to Spotify.
                                <a
                                    href={exportUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-primary hover:underline block mt-2"
                                >
                                    Open in Spotify →
                                </a>
                            </AlertDescription>
                        </Alert>
                    )}

                    {/* Export Form (only if linked) */}
                    {spotifyStatus && spotifyStatus.linked && (
                        <div className="space-y-3">
                            <div>
                                <label htmlFor="description" className="block text-sm font-medium mb-2">
                                    Description (Optional)
                                </label>
                                <Textarea
                                    id="description"
                                    placeholder="Add a description for your Spotify playlist"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    disabled={isExporting}
                                    rows={3}
                                    className="resize-none"
                                />
                                <p className="text-xs text-muted-foreground mt-1">
                                    Note: Re-exporting will create a new copy on Spotify.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Skeletons while checking */}
                    {checkingStatus && <Skeleton className="h-20 w-full" />}
                </div>

                <DialogFooter className="flex gap-2 justify-end">
                    <Button variant="outline" onClick={handleClose} disabled={isExporting}>
                        Cancel
                    </Button>

                    {spotifyStatus && !spotifyStatus.linked ? (
                        <Button onClick={handleLinkSpotify} disabled={isExporting}>
                            <LinkIcon className="mr-2 h-4 w-4" />
                            Link Spotify
                        </Button>
                    ) : spotifyStatus && spotifyStatus.linked && !exportUrl ? (
                        <Button onClick={handleExport} disabled={isExporting}>
                            {isExporting ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Exporting...
                                </>
                            ) : (
                                'Export'
                            )}
                        </Button>
                    ) : null}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
