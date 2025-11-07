'use client';

import { useMemo } from 'react';
import type { PlaylistTrackDto } from '@/types';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { GripVertical, Trash2, Music } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SortableTrackItemProps {
    track: PlaylistTrackDto;
    onRemove: (position: number) => void;
}

function SortableTrackItem({ track, onRemove }: SortableTrackItemProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: track.trackUri });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={cn(
                'flex items-center gap-3 p-4 bg-card border rounded-lg hover:bg-accent transition-colors',
                isDragging && 'opacity-50 bg-muted'
            )}
        >
            <button
                className="cursor-grab active:cursor-grabbing touch-none p-2 -m-2 hover:bg-muted rounded"
                {...attributes}
                {...listeners}
                aria-label="Drag to reorder"
            >
                <GripVertical className="h-4 w-4 text-muted-foreground" />
            </button>

            <div className="text-center font-mono text-sm text-muted-foreground w-8">
                {track.position}
            </div>

            <div className="flex-1 min-w-0">
                <div className="flex items-start gap-2">
                    <Music className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                    <div className="min-w-0">
                        <p className="font-medium truncate text-sm">{track.title}</p>
                        <p className="text-xs text-muted-foreground truncate">
                            {track.artist} • {track.album}
                        </p>
                    </div>
                </div>
            </div>

            <Button
                size="sm"
                variant="ghost"
                onClick={() => onRemove(track.position)}
                className="flex-shrink-0"
            >
                <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
        </div>
    );
}

interface ReorderableTrackListProps {
    tracks: PlaylistTrackDto[];
    isLoading: boolean;
    onDragEnd: (newOrder: PlaylistTrackDto[]) => void;
    onRemoveTrack: (position: number) => void;
}

export function ReorderableTrackList({
    tracks,
    isLoading,
    onDragEnd,
    onRemoveTrack,
}: ReorderableTrackListProps) {
    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const trackUris = useMemo(() => tracks.map((t) => t.trackUri), [tracks]);

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        if (over && active.id !== over.id) {
            const oldIndex = trackUris.indexOf(active.id as string);
            const newIndex = trackUris.indexOf(over.id as string);

            if (oldIndex !== -1 && newIndex !== -1) {
                const newOrder = arrayMove(tracks, oldIndex, newIndex);
                onDragEnd(newOrder);
            }
        }
    };

    if (isLoading) {
        return (
            <Card className="p-4">
                <div className="space-y-2">
                    {[1, 2, 3].map((i) => (
                        <Skeleton key={i} className="h-16 w-full" />
                    ))}
                </div>
            </Card>
        );
    }

    if (tracks.length === 0) {
        return (
            <Card className="p-8">
                <div className="flex flex-col items-center justify-center text-center">
                    <Music className="h-12 w-12 text-muted-foreground mb-3 opacity-50" />
                    <p className="text-muted-foreground font-medium">No tracks yet</p>
                    <p className="text-sm text-muted-foreground">
                        Add your first track to get started
                    </p>
                </div>
            </Card>
        );
    }

    return (
        <Card className="p-0 h-full">
            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
            >
                <SortableContext
                    items={trackUris}
                    strategy={verticalListSortingStrategy}
                >
                    <div className="space-y-1 p-4">
                        {tracks.map((track) => (
                            <SortableTrackItem
                                key={track.trackUri}
                                track={track}
                                onRemove={onRemoveTrack}
                            />
                        ))}
                    </div>
                </SortableContext>
            </DndContext>
        </Card>
    );
}
