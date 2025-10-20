import { PlaylistList } from '@/components/playlists/PlaylistList';

export default function PlaylistsPage() {
    return (
        <div className="container mx-auto py-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold">My Playlists</h1>
                <p className="text-muted-foreground mt-2">
                    Create, edit, and manage your music playlists
                </p>
            </div>
            <PlaylistList />
        </div>
    );
}
