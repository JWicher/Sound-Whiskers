'use client';

import { useState } from 'react';
import { MoreHorizontal, Edit, Trash2, Music } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { PlaylistListItemDto } from '@/types';
import { cn } from '@/lib/utils';

interface PlaylistItemProps {
    playlist: PlaylistListItemDto;
    onEdit?: (playlist: PlaylistListItemDto) => void;
    onDelete?: (playlistId: string) => Promise<void>;
    onClick?: (playlist: PlaylistListItemDto) => void;
    className?: string;
}

export function PlaylistItem({
    playlist,
    onEdit,
    onDelete,
    onClick,
    className
}: PlaylistItemProps) {
    const [isDeleting, setIsDeleting] = useState(false);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);

    const handleDelete = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!onDelete) return;
        setShowDeleteDialog(true);
    };

    const confirmDelete = async () => {
        if (!onDelete) return;

        setIsDeleting(true);

        try {
            await onDelete(playlist.id);
            toast.success('Playlist deleted successfully');
            setShowDeleteDialog(false);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to delete playlist';
            toast.error(message);
        } finally {
            setIsDeleting(false);
        }
    };

    const handleEdit = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (onEdit) {
            onEdit(playlist);
        }
    };

    const handleCardClick = () => {
        if (onClick && !playlist.isDeleted) {
            onClick(playlist);
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    return (
        <>
            <Card
                className={cn(
                    "transition-all duration-200 hover:shadow-md",
                    playlist.isDeleted && "opacity-50",
                    onClick && !playlist.isDeleted && "cursor-pointer hover:bg-accent/50",
                    className
                )}
                onClick={handleCardClick}
            >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <div className="flex items-center space-x-2">
                        <Music className="h-4 w-4 text-muted-foreground" />
                        <CardTitle className="text-base font-semibold line-clamp-1">
                            {playlist.name}
                        </CardTitle>
                        {playlist.isDeleted && (
                            <Badge variant="secondary" className="text-xs">
                                Deleted
                            </Badge>
                        )}
                    </div>

                    {!playlist.isDeleted && (onEdit || onDelete) && (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="ghost"
                                    className="h-8 w-8 p-0"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <MoreHorizontal className="h-4 w-4" />
                                    <span className="sr-only">Open menu</span>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                {onEdit && (
                                    <DropdownMenuItem onClick={handleEdit}>
                                        <Edit className="mr-2 h-4 w-4" />
                                        Edit
                                    </DropdownMenuItem>
                                )}
                                {onDelete && (
                                    <DropdownMenuItem
                                        onClick={handleDelete}
                                        disabled={isDeleting}
                                        className="text-destructive"

                                    >
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        {isDeleting ? 'Deleting...' : 'Delete'}
                                    </DropdownMenuItem>
                                )}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}
                </CardHeader>

                <CardContent>
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <div className="flex items-start flex-col w-full">
                            <span>{playlist.trackCount} tracks</span>
                            <span>Updated {formatDate(playlist.updatedAt)}</span>
                            <span className="text-xs text-right w-full">
                                Created {formatDate(playlist.createdAt)}
                            </span>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Playlist</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete "{playlist.name}"? This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setShowDeleteDialog(false)}
                            disabled={isDeleting}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={confirmDelete}
                            disabled={isDeleting}
                        >
                            {isDeleting ? 'Deleting...' : 'Delete'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
