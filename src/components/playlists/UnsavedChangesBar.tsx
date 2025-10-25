'use client';

import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

interface UnsavedChangesBarProps {
    isVisible: boolean;
    isSaving: boolean;
    onSaveOrder: () => Promise<void>;
    onDiscardChanges?: () => void;
}

export function UnsavedChangesBar({
    isVisible,
    isSaving,
    onSaveOrder,
    onDiscardChanges,
}: UnsavedChangesBarProps) {
    if (!isVisible) return null;

    return (
        <Alert variant="destructive" className="border-yellow-600 bg-yellow-50 dark:bg-yellow-950">
            <AlertCircle className="h-4 w-4 text-yellow-600" />
            <AlertTitle className="text-yellow-600">Unsaved Changes</AlertTitle>
            <AlertDescription className="text-yellow-700 dark:text-yellow-200 mt-2">
                <p className="mb-3">You have reordered tracks but haven&apos;t saved them yet.</p>
                <div className="flex gap-2">
                    <Button
                        size="sm"
                        onClick={onSaveOrder}
                        disabled={isSaving}
                        variant="default"
                    >
                        {isSaving ? 'Saving...' : 'Save Order'}
                    </Button>
                    {onDiscardChanges && (
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={onDiscardChanges}
                            disabled={isSaving}
                        >
                            Discard
                        </Button>
                    )}
                </div>
            </AlertDescription>
        </Alert>
    );
}
