'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Plus } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { CreatePlaylistCommand, PlaylistDto } from '@/types';

const createPlaylistSchema = z.object({
    name: z.string().min(1, 'Playlist name is required').max(100, 'Name too long'),
    description: z.string().max(500, 'Description too long').optional().nullable(),
});

type CreatePlaylistFormData = z.infer<typeof createPlaylistSchema>;

interface CreatePlaylistDialogProps {
    onPlaylistCreated: (data: CreatePlaylistCommand) => Promise<PlaylistDto>;
    isLoading?: boolean;
}

export function CreatePlaylistDialog({
    onPlaylistCreated,
    isLoading = false
}: CreatePlaylistDialogProps) {
    const [open, setOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const form = useForm<CreatePlaylistFormData>({
        resolver: zodResolver(createPlaylistSchema),
        defaultValues: {
            name: '',
            description: '',
        },
    });

    const onSubmit = async (data: CreatePlaylistFormData) => {
        setIsSubmitting(true);

        try {
            const command: CreatePlaylistCommand = {
                name: data.name,
                description: data.description || null,
            };

            await onPlaylistCreated(command);

            toast.success('Playlist created successfully!');
            form.reset();
            setOpen(false);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to create playlist';
            toast.error(message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleOpenChange = (newOpen: boolean) => {
        if (!isSubmitting) {
            setOpen(newOpen);
            if (!newOpen) {
                form.reset();
            }
        }
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                <Button disabled={isLoading}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Playlist
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] bg-gray-100">
                <DialogHeader>
                    <DialogTitle>Create New Playlist</DialogTitle>
                    <DialogDescription>
                        Create a new playlist to organize your favorite songs.
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Playlist Name</FormLabel>
                                    <FormControl>
                                        <Input
                                            placeholder="Enter playlist name..."
                                            {...field}
                                            disabled={isSubmitting}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="description"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Description (Optional)</FormLabel>
                                    <FormControl>
                                        <Input
                                            placeholder="Enter playlist description..."
                                            {...field}
                                            value={field.value || ''}
                                            disabled={isSubmitting}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="flex justify-end space-x-2 pt-4">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => handleOpenChange(false)}
                                disabled={isSubmitting}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Create Playlist
                            </Button>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
