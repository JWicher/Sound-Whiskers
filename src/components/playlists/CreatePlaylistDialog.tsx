'use client';

import { useCallback, useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { CreatePlaylistCommand, PlaylistDto } from '@/types';
import { useProfile } from '@/lib/hooks/useProfile';

import { AIPlaylistForm } from './create-playlist/AIPlaylistForm';
import { AIPlaylistPreview } from './create-playlist/AIPlaylistPreview';
import { AIProFeatureAlert } from './create-playlist/AIProFeatureAlert';
import { ManualPlaylistForm } from './create-playlist/ManualPlaylistForm';
import { PlaylistFormTabs } from './create-playlist/PlaylistFormTabs';
import { useAIPlaylistGeneration } from './create-playlist/hooks/useAIPlaylistGeneration';
import { usePlaylistApproval } from './create-playlist/hooks/usePlaylistApproval';
import { usePlaylistCreation } from './create-playlist/hooks/usePlaylistCreation';

interface CreatePlaylistDialogProps {
    onPlaylistCreated: (data: CreatePlaylistCommand) => Promise<PlaylistDto>;
    refreshPlaylists: () => Promise<void>;
    isLoading?: boolean;
}

export function CreatePlaylistDialog({
    onPlaylistCreated,
    refreshPlaylists,
    isLoading = false,
}: CreatePlaylistDialogProps) {
    const [open, setOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'manual' | 'ai'>('manual');
    const [dialogInstanceId, setDialogInstanceId] = useState(0);

    const { profile, isLoading: isLoadingProfile } = useProfile();

    const isPro = profile?.plan === 'pro';

    const { isCreating, createPlaylist } = usePlaylistCreation({ onPlaylistCreated });
    const { preview, isGenerating, generatePlaylist, reset } = useAIPlaylistGeneration({ isPro });

    const resetDialogForms = useCallback(() => {
        reset();
        setActiveTab('manual');
        setDialogInstanceId((prev) => prev + 1);
    }, [reset]);

    const closeDialog = useCallback(() => {
        setOpen(false);
        resetDialogForms();
    }, [resetDialogForms]);

    const { isApproving, approvePlaylist } = usePlaylistApproval({
        onPlaylistCreated,
        refreshPlaylists,
        onReset: closeDialog,
    });

    const isBusy = useMemo(
        () => isCreating || isGenerating || isApproving,
        [isApproving, isCreating, isGenerating],
    );

    const handleOpenChange = (newOpen: boolean) => {
        if (!newOpen && isBusy) {
            return;
        }

        setOpen(newOpen);

        if (!newOpen) {
            resetDialogForms();
        }
    };

    const handleTabChange = async (tab: 'manual' | 'ai') => {
        if (tab === 'ai' && profile?.plan !== 'pro') {
            toast.error('Upgrade to Pro to use AI playlist generation');
            return;
        } else {
            reset();
        }

        setActiveTab(tab);
    };

    const handleRejectPreview = () => {
        reset();
        toast.info('Playlist discarded. You can generate a new one.');
    };

    const manualContent = (
        <ManualPlaylistForm
            key={`manual-${dialogInstanceId}`}
            isSubmitting={isCreating}
            onSubmit={createPlaylist}
            onClose={closeDialog}
        />
    );

    const aiContent = !isPro ? (
        <AIProFeatureAlert />
    ) : preview ? (
        <AIPlaylistPreview
            preview={preview}
            onApprove={() => {
                void approvePlaylist(preview);
            }}
            onReject={handleRejectPreview}
            isApproving={isApproving}
        />
    ) : (
        <AIPlaylistForm
            key={`ai-${dialogInstanceId}`}
            onGenerate={generatePlaylist}
            onCancel={closeDialog}
            isGenerating={isGenerating}
            isProfileLoading={isLoadingProfile}
        />
    );

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                <Button disabled={isLoading}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Playlist
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[650px]">
                <DialogHeader>
                    <DialogTitle>Create New Playlist</DialogTitle>
                    <DialogDescription>
                        Create a playlist manually or let AI generate one for you.
                    </DialogDescription>
                </DialogHeader>

                <PlaylistFormTabs
                    activeTab={activeTab}
                    onTabChange={handleTabChange}
                    isPro={isPro}
                    manualContent={manualContent}
                    aiContent={aiContent}
                />
            </DialogContent>
        </Dialog>
    );
}
