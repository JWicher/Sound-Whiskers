import { z } from 'zod';

export const createPlaylistSchema = z.object({
    name: z.string().min(1, 'Playlist name is required').max(100, 'Name too long'),
    description: z.string().max(500, 'Description too long').optional().nullable(),
});

export const aiPromptSchema = z.object({
    prompt: z
        .string()
        .min(10, 'Please provide a more detailed description (at least 10 characters)')
        .max(500, 'Prompt is too long (max 500 characters)'),
});

export type CreatePlaylistFormData = z.infer<typeof createPlaylistSchema>;
export type AIPromptFormData = z.infer<typeof aiPromptSchema>;

