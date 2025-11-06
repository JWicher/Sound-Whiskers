import { useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { GeneratePlaylistResponseDto } from '@/types';

type GenerationStatus = 'idle' | 'generating' | 'preview';

interface UseAIPlaylistGenerationOptions {
    isPro: boolean;
}

export function useAIPlaylistGeneration({ isPro }: UseAIPlaylistGenerationOptions) {
    const [status, setStatus] = useState<GenerationStatus>('idle');
    const [preview, setPreview] = useState<GeneratePlaylistResponseDto | null>(null);

    const generatePlaylist = useCallback(
        async (prompt: string) => {
            if (!isPro) {
                toast.error('AI playlist generation is only available for PRO plan users');
                return;
            }

            setStatus('generating');

            try {
                const response = await fetch('/api/ai/generate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ prompt }),
                });

                if (response.status === 403) {
                    const errorData = await response.json().catch(() => null);
                    if (errorData?.code === 'PRO_PLAN_REQUIRED') {
                        toast.error('This feature requires a PRO plan. Please upgrade.');

                        throw new Error('This feature requires a PRO plan. Please upgrade.');

                    }
                }

                if (response.status === 429) {
                    toast.error(
                        'Monthly AI generation quota exceeded. Please upgrade or wait until next month.',
                    );

                    throw new Error('Monthly AI generation quota exceeded');

                }

                if (!response.ok) {
                    throw new Error('Failed to generate playlist');
                }

                const aiResult: GeneratePlaylistResponseDto = await response.json();

                if (aiResult.warningUnderMinCount) {
                    toast.warning(`Generated ${aiResult.count} tracks (recommended: 12+)`);
                }

                setPreview(aiResult);
                setStatus('preview');

                toast.success('Playlist generated! Review and approve to save.');
            } catch (error) {
                const message =
                    error instanceof Error ? error.message : 'Failed to generate playlist';
                toast.error(message);
                setStatus('idle');
            }
        },
        [isPro],
    );

    const reset = useCallback(() => {
        setPreview(null);
        setStatus('idle');
    }, []);

    const isGenerating = useMemo(() => status === 'generating', [status]);
    const isPreviewing = useMemo(() => status === 'preview', [status]);
    
    return {
        status,
        preview,
        isGenerating,
        isPreviewing,
        generatePlaylist,
        reset,
    };
}

