'use client';

import { Loader2, Sparkles, AlertCircle } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { Button } from '@/components/ui/button';
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';

import { AIPromptFormData, aiPromptSchema } from './schemas';

interface AIPlaylistFormProps {
    onGenerate: (prompt: string) => Promise<void> | void;
    onCancel: () => void;
    isGenerating: boolean;
    isProfileLoading: boolean;
}

export function AIPlaylistForm({
    onGenerate,
    onCancel,
    isGenerating,
    isProfileLoading,
}: AIPlaylistFormProps) {
    const form = useForm<AIPromptFormData>({
        resolver: zodResolver(aiPromptSchema),
        defaultValues: {
            prompt: '',
        },
    });

    const handleSubmit = form.handleSubmit(async (values) => {
        await onGenerate(values.prompt);
    });

    const handleCancel = () => {
        form.reset();
        onCancel();
    };

    const isSubmitDisabled = isGenerating || isProfileLoading;

    return (
        <Form {...form}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <FormField
                    control={form.control}
                    name="prompt"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Describe Your Playlist</FormLabel>
                            <FormControl>
                                <Textarea
                                    placeholder="Example: Create a playlist for a cozy rainy evening. I want mellow acoustic and lo-fi songs that feel warm and nostalgic."
                                    className="min-h-[120px] resize-none"
                                    {...field}
                                    disabled={isSubmitDisabled}
                                />
                            </FormControl>
                            <FormDescription>
                                Describe the mood, genre, occasion, or theme you want for your playlist. Be as creative as you like!
                            </FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="text-xs">
                        AI will generate a playlist with 12-20 tracks. The playlist name and description will be created automatically based on your prompt.
                    </AlertDescription>
                </Alert>

                <div className="flex justify-end space-x-2 pt-4">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={handleCancel}
                        disabled={isSubmitDisabled}
                    >
                        Cancel
                    </Button>
                    <Button type="submit" disabled={isSubmitDisabled}>
                        {isGenerating ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            <Sparkles className="mr-2 h-4 w-4" />
                        )}
                        Generate with AI
                    </Button>
                </div>
            </form>
        </Form>
    );
}

