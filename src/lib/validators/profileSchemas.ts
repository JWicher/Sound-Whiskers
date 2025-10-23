import { z } from 'zod';

// Body for updating profile username
export const updateProfileSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username must be 30 characters or less')
    .regex(
      /^[a-zA-Z0-9_-]+$/,
      'Username can only contain letters, numbers, underscores, and hyphens'
    ),
});

export type UpdateProfileCommand = z.infer<typeof updateProfileSchema>;
