import CommonPromptModal from '@components/modal/CommonPromptModal';
import { WarningIcon } from '@phosphor-icons/react';

export interface DiscardChangesPromptModalProps {
    open: boolean;
    onContinueEditing: VoidFunction;
    onDiscard: VoidFunction;
    title?: string;
    subtitle?: string;
    continueLabel?: string;
    discardLabel?: string;
}

/**
 * DiscardChangesPromptModal
 *
 * Prompts the user when they attempt to close a form or modal that has real
 * unsaved changes, asking whether to continue editing or discard the changes.
 */
export default function DiscardChangesPromptModal({
    open,
    onContinueEditing,
    onDiscard,
    title = 'Discard unsaved changes?',
    subtitle = 'You have unsaved changes. Would you like to continue editing or discard your changes?',
    continueLabel = 'Continue Editing',
    discardLabel = 'Discard'
}: DiscardChangesPromptModalProps) {
    return (
        <CommonPromptModal
            actionIconProps={{
                icon: WarningIcon,
                iconContainerClassName: 'bg-amber-100 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400'
            }}
            formButtonsProps={{
                cancelProps: {
                    children: continueLabel,
                    onClick: onContinueEditing
                },
                confirmProps: {
                    children: discardLabel,
                    color: 'error',
                    onClick: onDiscard
                }
            }}
            mainContent={{ title }}
            open={open}
            subContent={{ title: subtitle }}
            sx={{
                zIndex: (theme) => theme.zIndex.modal + 100
            }}
            onClose={onContinueEditing}
        />
    );
}