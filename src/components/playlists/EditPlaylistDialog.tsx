'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
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

const editPlaylistSchema = z.object({
    name: z.string().min(1, 'Playlist name is required').max(100, 'Name too long'),
    description: z.string().max(500, 'Description too long').optional().nullable(),
});

type EditPlaylistFormData = z.infer<typeof editPlaylistSchema>;

interface EditPlaylistDialogProps {
    playlist: { id: string; name: string };
    onUpdate: (id: string, data: { name?: string; description?: string | null }) => Promise<void>;
    onClose: () => void;
    isLoading?: boolean;
}

export function EditPlaylistDialog({
    playlist,
    onUpdate,
    onClose,
    isLoading = false
}: EditPlaylistDialogProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);

    const form = useForm<EditPlaylistFormData>({
        resolver: zodResolver(editPlaylistSchema),
        defaultValues: {
            name: playlist.name,
            description: '', // Note: description may not be available from minimal shape
        },
    });

    const onSubmit = async (data: EditPlaylistFormData) => {
        setIsSubmitting(true);

        try {
            await onUpdate(playlist.id, {
                name: data.name,
                description: data.description || null,
            });

            toast.success('Playlist updated successfully!');
            onClose();
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to update playlist';
            toast.error(message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleOpenChange = (open: boolean) => {
        if (!open && !isSubmitting) {
            onClose();
        }
    };

    return (
        <Dialog open={true} onOpenChange={handleOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Edit Playlist</DialogTitle>
                    <DialogDescription>
                        Update your playlist details.
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
                                            disabled={isSubmitting || isLoading}
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
                                            disabled={isSubmitting || isLoading}
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
                                onClick={onClose}
                                disabled={isSubmitting || isLoading}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isSubmitting || isLoading}>
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Update Playlist
                            </Button>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
