'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Edit, Trash2, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { EditPlaylistDialog } from '@/components/playlists/EditPlaylistDialog';
import { usePlaylist } from '@/lib/hooks/usePlaylist';

interface PlaylistDetailClientProps {
    id: string;
}

export function PlaylistDetailClient({ id }: PlaylistDetailClientProps) {
    const router = useRouter();
    const { playlist, loading, error, update, remove, fetchPlaylist } = usePlaylist(id);
    const [editing, setEditing] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const headerSubtitle = useMemo(() => {
        if (!playlist) return '';
        const updated = new Date(playlist.updatedAt).toLocaleString();
        const created = new Date(playlist.createdAt).toLocaleDateString();
        const count = playlist.trackCount ?? 0;
        return `${count} tracks • Updated ${updated} • Created ${created}`;
    }, [playlist]);

    const onSave = async (data: { name?: string; description?: string | null }) => {
        try {
            await update(data);
            toast.success('Playlist updated');
            setEditing(false);
        } catch (e) {
            const message = e instanceof Error ? e.message : 'Failed to update playlist';
            toast.error(message);
        }
    };

    const onDelete = async () => {
        if (!playlist) return;
        try {
            setDeleting(true);
            await remove();
            toast.success('Playlist deleted');
            router.push('/playlists');
        } catch (e) {
            const message = e instanceof Error ? e.message : 'Failed to delete playlist';
            toast.error(message);
        } finally {
            setDeleting(false);
        }
    };

    if (loading && !playlist) {
        return (
            <div className="container mx-auto py-8">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" /> Loading playlist...
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="container mx-auto py-8">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-destructive">Failed to load playlist</CardTitle>
                        <CardDescription>{error}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex gap-2">
                            <Button variant="outline" onClick={() => router.push('/playlists')}>
                                <ArrowLeft className="mr-2 h-4 w-4" /> Back to lists
                            </Button>
                            <Button onClick={fetchPlaylist}>Retry</Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (!playlist) return null;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">{playlist.name}</h1>
                    <p className="text-muted-foreground">{headerSubtitle}</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => router.push('/playlists')}>
                        <ArrowLeft className="mr-2 h-4 w-4" /> Back
                    </Button>
                    <Button variant="outline" onClick={() => setEditing(true)}>
                        <Edit className="mr-2 h-4 w-4" /> Edit
                    </Button>
                    <Button variant="destructive" onClick={onDelete} disabled={deleting}>
                        <Trash2 className="mr-2 h-4 w-4" /> {deleting ? 'Deleting...' : 'Delete'}
                    </Button>
                </div>
            </div>

            {playlist.description && (
                <Card>
                    <CardContent className="pt-6 text-sm text-muted-foreground">{playlist.description}</CardContent>
                </Card>
            )}

            <Separator />

            <Card>
                <CardHeader>
                    <CardTitle>Tracks</CardTitle>
                    <CardDescription>Track management coming soon</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="text-sm text-muted-foreground">No tracks UI yet.</div>
                </CardContent>
            </Card>

            {editing && (
                <EditPlaylistDialog
                    playlist={{ id: playlist.id, name: playlist.name }}
                    onUpdate={async (_id, data) => onSave(data)}
                    onClose={() => setEditing(false)}
                    isLoading={loading}
                />
            )}
        </div>
    );
}


