'use client';

import { Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { Button } from '@/components/ui/button';
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

import { CreatePlaylistFormData, createPlaylistSchema } from './schemas';

interface ManualPlaylistFormProps {
    isSubmitting: boolean;
    onSubmit: (command: CreatePlaylistCommand) => Promise<PlaylistDto | null>;
    onClose: () => void;
}

export function ManualPlaylistForm({ onSubmit, onClose, isSubmitting }: ManualPlaylistFormProps) {
    const form = useForm<CreatePlaylistFormData>({
        resolver: zodResolver(createPlaylistSchema),
        defaultValues: {
            name: '',
            description: '',
        },
    });

    const handleSubmit = form.handleSubmit(async (values) => {
        const command: CreatePlaylistCommand = {
            name: values.name,
            description: values.description || null,
        };

        const playlist = await onSubmit(command);
        if (playlist) {
            form.reset();
            onClose();
        }
    });

    const handleCancel = () => {
        form.reset();
        onClose();
    };

    return (
        <Form {...form}>
            <form onSubmit={handleSubmit} className="space-y-4">
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
                        onClick={handleCancel}
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
    );
}

