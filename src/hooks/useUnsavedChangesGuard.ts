import { useState } from 'react';

export interface UnsavedChangesGuardConfig {
    isDirty: boolean;
    onDiscard: VoidFunction;
    onSave: VoidFunction;
}

export interface UnsavedChangesGuardResult {
    closePrompt: VoidFunction;
    confirmDiscard: VoidFunction;
    confirmSave: VoidFunction;
    isPromptOpen: boolean;
    requestExit: VoidFunction;
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