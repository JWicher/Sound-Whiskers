'use client';

import { useState } from 'react';
import type { PlaylistDto } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Trash2, Edit2, X, Check } from 'lucide-react';

interface PlaylistMetaSectionProps {
    playlist: PlaylistDto | null;
    isLoading: boolean;
    onAddTracksClick: () => void;
    onDeletePlaylistClick: () => void;
    onUpdatePlaylist?: (data: { name?: string; description?: string | null }) => Promise<void>;
    isSaving?: boolean;
}

export function PlaylistMetaSection({
    playlist,
    isLoading,
    onAddTracksClick,
    onDeletePlaylistClick,
    onUpdatePlaylist,
    isSaving = false,
}: PlaylistMetaSectionProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [editName, setEditName] = useState(playlist?.name || '');
    const [editDescription, setEditDescription] = useState(playlist?.description || '');

    const handleSave = async () => {
        if (!onUpdatePlaylist) return;
        try {
            await onUpdatePlaylist({
                name: editName !== playlist?.name ? editName : undefined,
                description: editDescription !== playlist?.description ? editDescription : undefined,
            });
            setIsEditing(false);
        } catch {
            // Error is handled by parent
        }
    };

    const handleCancel = () => {
        setEditName(playlist?.name || '');
        setEditDescription(playlist?.description || '');
        setIsEditing(false);
    };

    if (isLoading || !playlist) {
        return (
            <Card>
                <CardHeader>
                    <Skeleton className="h-6 w-32" />
                    <Skeleton className="mt-2 h-4 w-full" />
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-8 w-20" />
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                {isEditing ? (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-2">Playlist Name</label>
                            <Input
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                disabled={isSaving}
                                placeholder="Playlist name"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-2">Description</label>
                            <Textarea
                                value={editDescription}
                                onChange={(e) => setEditDescription(e.target.value)}
                                disabled={isSaving}
                                placeholder="Add a description (optional)"
                                rows={3}
                            />
                        </div>
                        <div className="flex gap-2">
                            <Button
                                size="sm"
                                onClick={handleSave}
                                disabled={isSaving || !editName.trim()}
                            >
                                <Check className="mr-2 h-4 w-4" />
                                Save
                            </Button>
                            <Button
                                size="sm"
                                variant="ghost"
                                onClick={handleCancel}
                                disabled={isSaving}
                            >
                                <X className="mr-2 h-4 w-4" />
                                Cancel
                            </Button>
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="flex items-start justify-between">
                            <div className="flex-1">
                                <CardTitle>{playlist.name}</CardTitle>
                                {playlist.description && (
                                    <CardDescription className="mt-2">{playlist.description}</CardDescription>
                                )}
                            </div>
                            <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setIsEditing(true)}
                                disabled={!onUpdatePlaylist}
                            >
                                <Edit2 className="h-4 w-4" />
                            </Button>
                        </div>
                    </>
                )}
            </CardHeader>

            {!isEditing && (
                <CardContent>
                    <div className="space-y-3">
                        <div className="flex gap-2">
                            <Button
                                size="sm"
                                onClick={onAddTracksClick}
                                variant="default"
                            >
                                <Plus className="mr-2 h-4 w-4" />
                                Add Tracks
                            </Button>
                            <Button
                                size="sm"
                                variant="destructive"
                                onClick={onDeletePlaylistClick}
                            >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete Playlist
                            </Button>
                        </div>

                        <div className="flex gap-2 flex-wrap pt-2">
                            <Badge variant="outline">
                                Created {new Date(playlist.createdAt).toLocaleDateString()}
                            </Badge>
                            <Badge variant="outline">
                                Updated {new Date(playlist.updatedAt).toLocaleDateString()}
                            </Badge>
                        </div>
                    </div>
                </CardContent>
            )}
        </Card>
    );
}
