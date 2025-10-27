'use client';

import { useState, useEffect } from 'react';
import { Music, Link as LinkIcon, Unlink, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { useSpotifyStatus } from '@/lib/hooks/useSpotifyStatus';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export function SpotifyCard() {
    const { status, isLoading, unlinkSpotify, linkSpotify, refresh } = useSpotifyStatus();
    const [showUnlinkDialog, setShowUnlinkDialog] = useState(false);
    const [isUnlinking, setIsUnlinking] = useState(false);
    const [isLinking, setIsLinking] = useState(false);

    // Refresh Spotify status after component mounts to catch OAuth callback
    useEffect(() => {
        const timer = setTimeout(() => {
            refresh();
        }, 500);
        return () => clearTimeout(timer);
    }, [refresh]);

    const handleUnlink = async () => {
        setIsUnlinking(true);
        const success = await unlinkSpotify();
        setIsUnlinking(false);
        if (success) {
            setShowUnlinkDialog(false);
        }
    };

    const handleLink = async () => {
        setIsLinking(true);
        linkSpotify();
        // Note: The page will redirect to Spotify's OAuth, so the loading state
        // will remain visible during the redirect
    };

    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Spotify Integration</CardTitle>
                    <CardDescription>Connect your Spotify account to export playlists</CardDescription>
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-10 w-full" />
                </CardContent>
            </Card>
        );
    }

    const isLinked = status?.linked === true;
    const isExpired = status?.expiresAt ? new Date(status.expiresAt) < new Date() : false;
    const expiresAt = status?.expiresAt ? new Date(status.expiresAt) : null;
    const formattedExpiry = expiresAt?.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });

    return (
        <>
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Music className="h-5 w-5" />
                        Spotify Integration
                    </CardTitle>
                    <CardDescription>
                        Connect your Spotify account to export playlists directly
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Status Badge */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">Status:</span>
                            <Badge
                                variant={isLinked && !isExpired ? 'default' : 'secondary'}
                                className={cn(
                                    isLinked && !isExpired && 'bg-green-600 hover:bg-green-700',
                                    isExpired && 'bg-amber-600 hover:bg-amber-700'
                                )}
                            >
                                {isLinked && !isExpired && 'Connected'}
                                {isLinked && isExpired && 'Expired'}
                                {!isLinked && 'Not Connected'}
                            </Badge>
                        </div>
                    </div>

                    {/* Expiry Information */}
                    {isLinked && expiresAt && (
                        <div className="rounded-lg bg-muted p-3 text-sm">
                            {isExpired ? (
                                <p className="text-destructive font-medium">
                                    Connection expired on {formattedExpiry}
                                </p>
                            ) : (
                                <p className="text-muted-foreground">
                                    Expires on {formattedExpiry}
                                </p>
                            )}
                        </div>
                    )}

                    {/* Warning Message */}
                    {isExpired && (
                        <div className="rounded-lg bg-amber-50 dark:bg-amber-950 p-3 border border-amber-200 dark:border-amber-800">
                            <p className="text-sm text-amber-900 dark:text-amber-100">
                                Your Spotify connection has expired. Please reconnect to continue exporting playlists.
                            </p>
                        </div>
                    )}

                    {!isLinked && (
                        <div className="rounded-lg bg-blue-50 dark:bg-blue-950 p-3 border border-blue-200 dark:border-blue-800">
                            <p className="text-sm text-blue-900 dark:text-blue-100">
                                Link your Spotify account to export playlists with a single click.
                            </p>
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                        {!isLinked || isExpired ? (
                            <Button
                                onClick={handleLink}
                                disabled={isLinking}
                                className="w-full sm:w-auto"
                            >
                                {isLinking ? (
                                    <>
                                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                                        Redirecting...
                                    </>
                                ) : (
                                    <>
                                        <LinkIcon className="mr-2 h-4 w-4" />
                                        {isExpired ? 'Reconnect Spotify' : 'Link Spotify Account'}
                                    </>
                                )}
                            </Button>
                        ) : (
                            <>
                                <Button
                                    onClick={() => setShowUnlinkDialog(true)}
                                    variant="outline"
                                    className="w-full sm:w-auto"
                                    disabled={isUnlinking}
                                >
                                    <Unlink className="mr-2 h-4 w-4" />
                                    Unlink Account
                                </Button>
                            </>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Unlink Confirmation Dialog */}
            <Dialog open={showUnlinkDialog} onOpenChange={setShowUnlinkDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Unlink Spotify Account</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to unlink your Spotify account? You won&apos;t be able to export
                            playlists until you reconnect.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setShowUnlinkDialog(false)}
                            disabled={isUnlinking}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleUnlink}
                            disabled={isUnlinking}
                        >
                            {isUnlinking ? (
                                <>
                                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                                    Unlinking...
                                </>
                            ) : (
                                'Unlink'
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}

