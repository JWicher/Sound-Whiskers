'use client';

import type { ReactNode } from 'react';
import { useForm, type FieldValues, type DefaultValues, type Path, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import type { z } from 'zod';

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

type EmailPasswordFields = {
    email: string;
    password: string;
    passwordConfirm?: string;
};

/**
 * Helper to create a properly typed resolver for zodResolver
 * 
 * This bridges the gap between Zod's schema types and React Hook Form's Resolver type.
 * The type assertion through 'unknown' is necessary because zodResolver's generic constraints
 * in @hookform/resolvers/zod don't support the generic pattern we need here, even though
 * the runtime behavior is correct and type-safe at the call site.
 */
function createResolver<TValues extends FieldValues>(
    schema: z.ZodSchema<TValues>
): Resolver<TValues> {
    // Wrap zodResolver call to bypass type checking limitations with generic schemas
    return (zodResolver as (schema: z.ZodSchema<TValues>) => Resolver<TValues>)(schema);
}

interface EmailPasswordFormProps<TValues extends EmailPasswordFields & FieldValues> {
    schema: z.ZodSchema<TValues>;
    onSubmit: (data: TValues) => Promise<void>;
    submitLabel: string;
    isSubmitting?: boolean;
    showPasswordConfirm?: boolean;
    showPasswordHints?: boolean;
    children?: ReactNode;
}

export function EmailPasswordForm<TValues extends EmailPasswordFields & FieldValues>({
    schema,
    onSubmit,
    submitLabel,
    isSubmitting = false,
    showPasswordConfirm = false,
    showPasswordHints = false,
    children,
}: EmailPasswordFormProps<TValues>) {
    const resolver = createResolver(schema);

    const form = useForm<TValues>({
        resolver,
        defaultValues: {
            email: '',
            password: '',
            passwordConfirm: '',
        } as DefaultValues<TValues>,
    });

    const handleSubmit = async (data: TValues) => {
        await onSubmit(data);
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                <FormField
                    control={form.control}
                    name={"email" as Path<TValues>}
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
                    name={"password" as Path<TValues>}
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
                        name={"passwordConfirm" as Path<TValues>}
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

