'use client';

import { useState } from 'react';
import { Music, Link as LinkIcon, Unlink } from 'lucide-react';
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

export function SpotifyCard() {
    const { status, isLoading, unlinkSpotify, linkSpotify } = useSpotifyStatus();
    const [showUnlinkDialog, setShowUnlinkDialog] = useState(false);
    const [isUnlinking, setIsUnlinking] = useState(false);

    const handleUnlink = async () => {
        setIsUnlinking(true);
        const success = await unlinkSpotify();
        setIsUnlinking(false);
        if (success) {
            setShowUnlinkDialog(false);
        }
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
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">Status:</span>
                        <Badge
                            variant={isLinked && !isExpired ? 'default' : 'secondary'}
                        >
                            {isLinked && !isExpired && 'Connected'}
                            {isLinked && isExpired && 'Expired - Reconnect'}
                            {!isLinked && 'Not Connected'}
                        </Badge>
                    </div>

                    {isExpired && (
                        <p className="text-sm text-muted-foreground">
                            Your Spotify connection has expired. Please reconnect to continue exporting playlists.
                        </p>
                    )}

                    <div className="flex gap-2">
                        {!isLinked || isExpired ? (
                            <Button onClick={linkSpotify} className="w-full sm:w-auto">
                                <LinkIcon className="mr-2 h-4 w-4" />
                                {isExpired ? 'Reconnect Spotify' : 'Link Spotify Account'}
                            </Button>
                        ) : (
                            <Button
                                onClick={() => setShowUnlinkDialog(true)}
                                variant="outline"
                                className="w-full sm:w-auto"
                            >
                                <Unlink className="mr-2 h-4 w-4" />
                                Unlink Account
                            </Button>
                        )}
                    </div>
                </CardContent>
            </Card>

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
                            Unlink
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}

