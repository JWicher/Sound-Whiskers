'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Loader2, CheckCircle2 } from 'lucide-react';

import { AuthCard } from '@/components/auth/AuthCard';
import { Button } from '@/components/ui/button';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
    FormDescription,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { forgotPasswordSchema, ForgotPasswordFormData } from '@/lib/validators/authSchemas';
import { createClient } from '@/lib/supabase/client';

export default function ForgotPasswordPage() {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [emailSent, setEmailSent] = useState(false);
    const [submittedEmail, setSubmittedEmail] = useState('');
    const supabase = createClient();

    const form = useForm<ForgotPasswordFormData>({
        resolver: zodResolver(forgotPasswordSchema),
        defaultValues: {
            email: '',
        },
    });

    const handleSubmit = async (data: ForgotPasswordFormData) => {
        setIsSubmitting(true);
        try {
            const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
                redirectTo: `${window.location.origin}/auth/reset-password`,
            });

            if (error) {
                toast.error('Failed to send reset email. Please try again.');
                return;
            }

            setSubmittedEmail(data.email);
            setEmailSent(true);
            toast.success('Reset instructions sent!');
        } catch (error) {
            console.error('Forgot password request failed', error);
            toast.error('An error occurred. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (emailSent) {
        return (
            <div className="container mx-auto flex min-h-[calc(100vh-3.5rem)] items-center justify-center py-8">
                <AuthCard
                    title="Check your email"
                    description="Password reset instructions sent"
                    footer={
                        <div className="w-full text-center text-sm text-muted-foreground">
                            Remember your password?{' '}
                            <Link href="/auth/login" className="font-medium text-primary hover:underline">
                                Sign in
                            </Link>
                        </div>
                    }
                >
                    <div className="flex items-start gap-3 rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-900 dark:bg-green-950">
                        <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                        <div className="flex-1 space-y-1">
                            <p className="text-sm font-medium text-green-900 dark:text-green-100">
                                Email sent successfully
                            </p>
                            <p className="text-sm text-green-700 dark:text-green-300">
                                If an account exists for <strong>{submittedEmail}</strong>, we&apos;ve sent password
                                reset instructions. Check your email and follow the link to reset your password.
                            </p>
                        </div>
                    </div>
                </AuthCard>
            </div>
        );
    }

    return (
        <div className="container mx-auto flex min-h-[calc(100vh-3.5rem)] items-center justify-center py-8">
            <AuthCard
                title="Reset your password"
                description="Enter your email and we'll send you reset instructions"
                footer={
                    <div className="w-full space-y-4">
                        <Separator />
                        <div className="text-center text-sm text-muted-foreground">
                            Remember your password?{' '}
                            <Link href="/auth/login" className="font-medium text-primary hover:underline">
                                Sign in
                            </Link>
                        </div>
                    </div>
                }
            >
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="email"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Email</FormLabel>
                                    <FormControl>
                                        <Input
                                            type="email"
                                            placeholder="Enter your email..."
                                            autoComplete="email"
                                            disabled={isSubmitting}
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormDescription>
                                        We&apos;ll send password reset instructions to this email
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <Button type="submit" className="w-full" disabled={isSubmitting}>
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Send reset instructions
                        </Button>
                    </form>
                </Form>
            </AuthCard>
        </div>
    );
}

