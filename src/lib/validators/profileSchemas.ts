import { z } from 'zod';

// Body for updating profile username
export const updateProfileSchema = z.object({
  username: z
    .string()
    .min(1, 'Username is required')
    .max(50, 'Username must be 50 characters or less')
    .regex(
      /^[a-zA-Z0-9_]+$/,
      'Username can only contain letters, numbers, and underscores'
    ),
});

export type UpdateProfileCommand = z.infer<typeof updateProfileSchema>;
