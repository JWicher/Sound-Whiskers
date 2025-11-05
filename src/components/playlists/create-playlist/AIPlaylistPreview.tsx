'use client';

import { Loader2, Sparkles } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { GeneratePlaylistResponseDto } from '@/types';

interface AIPlaylistPreviewProps {
    preview: GeneratePlaylistResponseDto;
    onApprove: () => void;
    onReject: () => void;
    isApproving: boolean;
}

export function AIPlaylistPreview({
    preview,
    onApprove,
    onReject,
    isApproving,
}: AIPlaylistPreviewProps) {
    return (
        <div className="space-y-4">
            <Alert>
                <Sparkles className="h-4 w-4" />
                <AlertDescription>
                    Review your AI-generated playlist before saving it to your library.
                </AlertDescription>
            </Alert>

            <div className="space-y-3">
                <div>
                    <h3 className="font-semibold text-lg">
                        {preview.playlistName || 'AI Generated Playlist'}
                    </h3>
                    {preview.playlistDescription && (
                        <p className="text-sm text-muted-foreground mt-1">
                            {preview.playlistDescription}
                        </p>
                    )}
                </div>

                <Separator />

                <div>
                    <p className="text-sm font-medium mb-2">Tracks ({preview.count}):</p>
                    <div className="max-h-[300px] overflow-y-auto rounded-md border p-3">
                        <ol className="list-decimal list-inside space-y-2 text-sm">
                            {preview.items.map((track, index) => (
                                <li key={`${track.trackUri ?? track.title}-${index}`} className="text-foreground">
                                    <span className="font-medium">{track.title}</span>
                                    <span className="text-muted-foreground"> - {track.artist}</span>
                                    {track.album && (
                                        <span className="text-muted-foreground text-xs">
                                            {' '}
                                            ({track.album})
                                        </span>
                                    )}
                                </li>
                            ))}
                        </ol>
                    </div>
                </div>

                {preview.summary && (
                    <>
                        <Separator />
                        <div className="rounded-md bg-muted p-3">
                            <p className="text-xs text-muted-foreground">{preview.summary}</p>
                        </div>
                    </>
                )}
            </div>

            <div className="flex justify-end space-x-2 pt-4">
                <Button
                    type="button"
                    variant="outline"
                    onClick={onReject}
                    disabled={isApproving}
                >
                    Reject
                </Button>
                <Button type="button" onClick={onApprove} disabled={isApproving}>
                    {isApproving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Approve &amp; Save
                </Button>
            </div>
        </div>
    );
}

