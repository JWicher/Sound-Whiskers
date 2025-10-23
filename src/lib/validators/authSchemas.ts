import { z } from 'zod';

export const loginSchema = z.object({
    email: z.email('Please enter a valid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const registerSchema = z.object({
    email: z.email('Please enter a valid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    passwordConfirm: z.string(),
}).refine((data) => data.password === data.passwordConfirm, {
    message: 'Passwords do not match',
    path: ['passwordConfirm'],
});

export const forgotPasswordSchema = z.object({
    email: z.email('Please enter a valid email address'),
});

export const resetPasswordSchema = z.object({
    accessToken: z.string().min(1, 'Access token is required'),
    newPassword: z.string().min(8, 'Password must be at least 8 characters'),
    passwordConfirm: z.string(),
}).refine((data) => data.newPassword === data.passwordConfirm, {
    message: 'Passwords do not match',
    path: ['passwordConfirm'],
});

export const magicLinkSchema = z.object({
    email: z.email('Please enter a valid email address'),
});

export type LoginFormData = z.infer<typeof loginSchema>;
export type RegisterFormData = z.infer<typeof registerSchema>;
export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;
export type MagicLinkFormData = z.infer<typeof magicLinkSchema>;

