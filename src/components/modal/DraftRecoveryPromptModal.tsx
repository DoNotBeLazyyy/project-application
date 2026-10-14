import AlertPromptModal from '@components/modal/AlertPromptModal';
import { ClockCounterClockwiseIcon } from '@phosphor-icons/react';

export interface DraftRecoveryPromptModalProps {
    open: boolean;
    onContinue: () => void;
    onDiscard: () => void;
    title?: string;
    subtitle?: string;
}

/**
 * DraftRecoveryPromptModal
 *
 * Prompts the user when a preserved session draft is detected after a page
 * restart or reload, offering to restore the previous inputs or discard them.
 */
export default function DraftRecoveryPromptModal({
    open,
    onContinue,
    onDiscard,
    title = 'Restore Unsaved Draft?',
    subtitle = 'You have unsaved changes from earlier. Would you like to continue editing where you left off, or discard them?'
}: DraftRecoveryPromptModalProps) {
    return (
        <AlertPromptModal
            actionIconProps={{
                icon: ClockCounterClockwiseIcon,
                iconContainerClassName: 'bg-(--mui-tokens-color-200) text-(--mui-tokens-color-primary-main)'
            }}
            formButtonsProps={{
                cancelProps: {
                    children: 'Discard',
                    color: 'error',
                    variant: 'outlined',
                    onClick: onDiscard
                },
                confirmProps: {
                    children: 'Continue',
                    color: 'primary',
                    variant: 'contained',
                    onClick: onContinue
                }
            }}
            mainContent={{ title }}
            open={open}
            subContent={{ title: subtitle }}
            sx={{
                zIndex: (theme) => theme.zIndex.modal + 100
            }}
            onClose={onDiscard}
        />
    );
}
