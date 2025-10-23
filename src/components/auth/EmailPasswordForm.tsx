'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { z } from 'zod';

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
import { PasswordInput } from './PasswordInput';

interface EmailPasswordFormProps {
    schema: z.ZodType<any, any, any>;
    onSubmit: (data: any) => Promise<void>;
    submitLabel: string;
    isSubmitting?: boolean;
    showPasswordConfirm?: boolean;
    showPasswordHints?: boolean;
    children?: React.ReactNode;
}

export function EmailPasswordForm({
    schema,
    onSubmit,
    submitLabel,
    isSubmitting = false,
    showPasswordConfirm = false,
    showPasswordHints = false,
    children,
}: EmailPasswordFormProps) {
    const form = useForm({
        resolver: zodResolver(schema),
        defaultValues: {
            email: '',
            password: '',
            passwordConfirm: '',
        },
    });

    const handleSubmit = async (data: any) => {
        await onSubmit(data);
    };

    return (
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
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Password</FormLabel>
                            <FormControl>
                                <PasswordInput
                                    value={field.value}
                                    onChange={field.onChange}
                                    placeholder="Enter your password..."
                                    disabled={isSubmitting}
                                    autoComplete={showPasswordConfirm ? 'new-password' : 'current-password'}
                                />
                            </FormControl>
                            {showPasswordHints && (
                                <FormDescription>
                                    Use at least 8 characters with a mix of letters and numbers
                                </FormDescription>
                            )}
                            <FormMessage />
                        </FormItem>
                    )}
                />

                {showPasswordConfirm && (
                    <FormField
                        control={form.control}
                        name="passwordConfirm"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Confirm Password</FormLabel>
                                <FormControl>
                                    <PasswordInput
                                        value={field.value}
                                        onChange={field.onChange}
                                        placeholder="Confirm your password..."
                                        disabled={isSubmitting}
                                        autoComplete="new-password"
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                )}

                {children}

                <Button type="submit" className="w-full" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {submitLabel}
                </Button>
            </form>
        </Form>
    );
}

