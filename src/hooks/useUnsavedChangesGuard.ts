import { useState } from 'react';

export interface UnsavedChangesGuardConfig {
    isDirty: boolean;
    onDiscard: () => void;
    onSave: () => void;
}

export interface UnsavedChangesGuardResult {
    closePrompt: () => void;
    confirmDiscard: () => void;
    confirmSave: () => void;
    isPromptOpen: boolean;
    requestExit: () => void;
}

export function useUnsavedChangesGuard({
    isDirty,
    onDiscard,
    onSave
}: UnsavedChangesGuardConfig): UnsavedChangesGuardResult {
    const [isPromptOpen, setIsPromptOpen] = useState(false);

    function requestExit() {
        if (isDirty) {
            setIsPromptOpen(true);
            return;
        }

        onDiscard();
    }

    function closePrompt() {
        setIsPromptOpen(false);
    }

    function confirmDiscard() {
        setIsPromptOpen(false);
        onDiscard();
    }

    function confirmSave() {
        setIsPromptOpen(false);
        onSave();
    }

    return {
        closePrompt,
        confirmDiscard,
        confirmSave,
        isPromptOpen,
        requestExit
    };
}