'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, RefreshCw, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { usePlaylists } from '@/lib/hooks/usePlaylists';
import { PlaylistItem } from './PlaylistItem';
import { CreatePlaylistDialog } from './CreatePlaylistDialog';
import { EditPlaylistDialog } from './EditPlaylistDialog';
import { PlaylistListItemDto, ListPlaylistsOptions } from '@/types';
import { useDebounce } from '@/lib/hooks/useDebounce';

export function PlaylistList() {
    const router = useRouter();

    const {
        playlists,
        loading,
        error,
        fetchPlaylists,
        createPlaylist,
        updatePlaylist,
        deletePlaylist,
        refreshPlaylists
    } = usePlaylists();

    const [searchQuery, setSearchQuery] = useState('');
    const [editingPlaylist, setEditingPlaylist] = useState<PlaylistListItemDto | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [sortOrder, setSortOrder] = useState<string>('updated_at.desc');
    const [activeTab, setActiveTab] = useState<'active' | 'deleted'>('active');
    const debouncedSearchQuery = useDebounce(searchQuery, 300);

    const handleSearch = async () => {
        setCurrentPage(1);

        const options: Partial<ListPlaylistsOptions> = {
            page: 1,
            search: debouncedSearchQuery || undefined,
            sort: sortOrder,
            isDeleted: activeTab === 'deleted'
        };

        await fetchPlaylists(options);
    };

    useEffect(() => {
        handleSearch();
    }, [debouncedSearchQuery, activeTab]);

    const handleSortChange = async (newSort: string) => {
        setSortOrder(newSort);
        setCurrentPage(1);

        const options: Partial<ListPlaylistsOptions> = {
            page: 1,
            search: searchQuery || undefined,
            sort: newSort,
            isDeleted: activeTab === 'deleted'
        };

        await fetchPlaylists(options);
    };

    const handlePageChange = async (page: number) => {
        setCurrentPage(page);

        const options: Partial<ListPlaylistsOptions> = {
            page,
            search: searchQuery || undefined,
            sort: sortOrder,
            isDeleted: activeTab === 'deleted'
        };

        await fetchPlaylists(options);
    };

    const handleTabChange = (tab: 'active' | 'deleted') => {
        setActiveTab(tab);
        setCurrentPage(1);
        setSearchQuery('');
    };

    const handleEditPlaylist = (playlist: PlaylistListItemDto) => {
        setEditingPlaylist(playlist);
    };

    const handleCloseEditDialog = () => {
        setEditingPlaylist(null);
    };

    const handleUpdatePlaylist = async (id: string, data: { name?: string; description?: string | null }) => {
        await updatePlaylist(id, data);
        handleCloseEditDialog();
    };

    if (error) {
        return (
            <Card className="w-full">
                <CardHeader>
                    <CardTitle className="text-destructive">Error</CardTitle>
                    <CardDescription>{error}</CardDescription>
                </CardHeader>
                <CardContent>
                    <Button onClick={refreshPlaylists} variant="outline">
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Try Again
                    </Button>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-6 h-full">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">My Playlists</h1>
                    <p className="text-muted-foreground">
                        Manage your music collections
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={refreshPlaylists}
                        disabled={loading}
                    >
                        <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>

                    {activeTab === 'active' && (
                        <CreatePlaylistDialog
                            onPlaylistCreated={createPlaylist}
                            refreshPlaylists={refreshPlaylists}
                            isLoading={loading}
                        />
                    )}
                </div>
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={(value) => handleTabChange(value as 'active' | 'deleted')} className="w-full">
                <TabsList className="grid w-full grid-cols-2 max-w-xs">
                    <TabsTrigger value="active">Active Playlists</TabsTrigger>
                    <TabsTrigger value="deleted" className="flex items-center gap-2">
                        <Trash2 className="h-4 w-4" />
                        Deleted
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="active" className="space-y-6">
                    {/* Search and Filters */}
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex flex-col sm:flex-row gap-4">
                                <div className="relative flex-1">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Search playlists..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="pl-10"
                                    />
                                </div>

                                <div className="flex items-center gap-2">
                                    <span className="text-sm text-muted-foreground">Sort by:</span>
                                    <Button
                                        variant={sortOrder === 'updated_at.desc' ? 'default' : 'outline'}
                                        size="sm"
                                        onClick={() => handleSortChange('updated_at.desc')}
                                        disabled={loading}
                                    >
                                        Recently Updated
                                    </Button>
                                    <Button
                                        variant={sortOrder === 'name.asc' ? 'default' : 'outline'}
                                        size="sm"
                                        onClick={() => handleSortChange('name.asc')}
                                        disabled={loading}
                                    >
                                        Name A-Z
                                    </Button>
                                    <Button
                                        variant={sortOrder === 'created_at.desc' ? 'default' : 'outline'}
                                        size="sm"
                                        onClick={() => handleSortChange('created_at.desc')}
                                        disabled={loading}
                                    >
                                        Recently Created
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Results Summary */}
                    {playlists && (
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Badge variant="secondary">
                                    {playlists.total} total playlists
                                </Badge>
                                {searchQuery && (
                                    <Badge variant="outline">
                                        Searching for &quot;{searchQuery}&quot;
                                    </Badge>
                                )}
                            </div>

                            <div className="text-sm text-muted-foreground">
                                Page {playlists.page} of {Math.ceil(playlists.total / playlists.pageSize)}
                            </div>
                        </div>
                    )}

                    {/* Playlist Grid */}
                    {loading && !playlists ? (
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {Array.from({ length: 6 }).map((_, i) => (
                                <Card key={i} className="animate-pulse">
                                    <CardHeader>
                                        <div className="h-4 bg-muted rounded w-3/4"></div>
                                        <div className="h-3 bg-muted rounded w-1/2"></div>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="h-3 bg-muted rounded w-full"></div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    ) : playlists?.items.length === 0 ? (
                        <Card>
                            <CardContent className="flex flex-col items-center justify-center py-12">
                                <div className="text-center space-y-2">
                                    <h3 className="text-lg font-semibold">No playlists found</h3>
                                    <p className="text-muted-foreground">
                                        {searchQuery
                                            ? `No playlists match "${searchQuery}". Try a different search term.`
                                            : "You haven't created any playlists yet. Create your first playlist to get started!"
                                        }
                                    </p>
                                    {!searchQuery && (
                                        <div className="pt-4">
                                            <CreatePlaylistDialog
                                                onPlaylistCreated={createPlaylist}
                                                refreshPlaylists={refreshPlaylists}
                                                isLoading={loading}
                                            />
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {playlists?.items.map((playlist) => (
                                <PlaylistItem
                                    key={playlist.id}
                                    playlist={playlist}
                                    onEdit={handleEditPlaylist}
                                    onDelete={deletePlaylist}
                                    onClick={() => router.push(`/playlists/${playlist.id}`)}
                                />
                            ))}
                        </div>
                    )}

                    {/* Pagination */}
                    {playlists && playlists.total > playlists.pageSize && (
                        <div className="flex justify-center items-center gap-2">
                            <Button
                                variant="outline"
                                onClick={() => handlePageChange(currentPage - 1)}
                                disabled={currentPage === 1 || loading}
                            >
                                Previous
                            </Button>

                            <div className="flex items-center gap-1">
                                {Array.from({
                                    length: Math.min(5, Math.ceil(playlists.total / playlists.pageSize))
                                }).map((_, i) => {
                                    const pageNum = Math.max(1, currentPage - 2) + i;
                                    const totalPages = Math.ceil(playlists.total / playlists.pageSize);

                                    if (pageNum > totalPages) return null;

                                    return (
                                        <Button
                                            key={pageNum}
                                            variant={pageNum === currentPage ? 'default' : 'outline'}
                                            size="sm"
                                            onClick={() => handlePageChange(pageNum)}
                                            disabled={loading}
                                        >
                                            {pageNum}
                                        </Button>
                                    );
                                })}
                            </div>

                            <Button
                                variant="outline"
                                onClick={() => handlePageChange(currentPage + 1)}
                                disabled={currentPage >= Math.ceil(playlists.total / playlists.pageSize) || loading}
                            >
                                Next
                            </Button>
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="deleted" className="space-y-6">
                    {/* Search and Filters for Deleted */}
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex flex-col sm:flex-row gap-4">
                                <div className="relative flex-1">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Search deleted playlists..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="pl-10"
                                    />
                                </div>

                                <div className="flex items-center gap-2">
                                    <span className="text-sm text-muted-foreground">Sort by:</span>
                                    <Button
                                        variant={sortOrder === 'updated_at.desc' ? 'default' : 'outline'}
                                        size="sm"
                                        onClick={() => handleSortChange('updated_at.desc')}
                                        disabled={loading}
                                    >
                                        Recently Updated
                                    </Button>
                                    <Button
                                        variant={sortOrder === 'name.asc' ? 'default' : 'outline'}
                                        size="sm"
                                        onClick={() => handleSortChange('name.asc')}
                                        disabled={loading}
                                    >
                                        Name A-Z
                                    </Button>
                                    <Button
                                        variant={sortOrder === 'created_at.desc' ? 'default' : 'outline'}
                                        size="sm"
                                        onClick={() => handleSortChange('created_at.desc')}
                                        disabled={loading}
                                    >
                                        Recently Created
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Results Summary */}
                    {playlists && (
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Badge variant="secondary">
                                    {playlists.total} deleted playlists
                                </Badge>
                                {searchQuery && (
                                    <Badge variant="outline">
                                        Searching for &quot;{searchQuery}&quot;
                                    </Badge>
                                )}
                            </div>

                            <div className="text-sm text-muted-foreground">
                                Page {playlists.page} of {Math.ceil(playlists.total / playlists.pageSize)}
                            </div>
                        </div>
                    )}

                    {/* Playlist Grid */}
                    {loading && !playlists ? (
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {Array.from({ length: 6 }).map((_, i) => (
                                <Card key={i} className="animate-pulse">
                                    <CardHeader>
                                        <div className="h-4 bg-muted rounded w-3/4"></div>
                                        <div className="h-3 bg-muted rounded w-1/2"></div>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="h-3 bg-muted rounded w-full"></div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    ) : playlists?.items.length === 0 ? (
                        <Card>
                            <CardContent className="flex flex-col items-center justify-center py-12">
                                <div className="text-center space-y-2">
                                    <h3 className="text-lg font-semibold">No deleted playlists</h3>
                                    <p className="text-muted-foreground">
                                        {searchQuery
                                            ? `No deleted playlists match "${searchQuery}".`
                                            : "You have no deleted playlists. Playlists will appear here when deleted."
                                        }
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {playlists?.items.map((playlist) => (
                                <PlaylistItem
                                    key={playlist.id}
                                    playlist={playlist}
                                    onEdit={handleEditPlaylist}
                                    onDelete={deletePlaylist}
                                    onClick={() => router.push(`/playlists/${playlist.id}`)}
                                />
                            ))}
                        </div>
                    )}

                    {/* Pagination */}
                    {playlists && playlists.total > playlists.pageSize && (
                        <div className="flex justify-center items-center gap-2">
                            <Button
                                variant="outline"
                                onClick={() => handlePageChange(currentPage - 1)}
                                disabled={currentPage === 1 || loading}
                            >
                                Previous
                            </Button>

                            <div className="flex items-center gap-1">
                                {Array.from({
                                    length: Math.min(5, Math.ceil(playlists.total / playlists.pageSize))
                                }).map((_, i) => {
                                    const pageNum = Math.max(1, currentPage - 2) + i;
                                    const totalPages = Math.ceil(playlists.total / playlists.pageSize);

                                    if (pageNum > totalPages) return null;

                                    return (
                                        <Button
                                            key={pageNum}
                                            variant={pageNum === currentPage ? 'default' : 'outline'}
                                            size="sm"
                                            onClick={() => handlePageChange(pageNum)}
                                            disabled={loading}
                                        >
                                            {pageNum}
                                        </Button>
                                    );
                                })}
                            </div>

                            <Button
                                variant="outline"
                                onClick={() => handlePageChange(currentPage + 1)}
                                disabled={currentPage >= Math.ceil(playlists.total / playlists.pageSize) || loading}
                            >
                                Next
                            </Button>
                        </div>
                    )}
                </TabsContent>
            </Tabs>

            {/* Edit Dialog */}
            {editingPlaylist && (
                <EditPlaylistDialog
                    playlist={editingPlaylist}
                    onUpdate={handleUpdatePlaylist}
                    onClose={handleCloseEditDialog}
                    isLoading={loading}
                />
            )}
        </div>
    );
}
