import AlertPromptModal from '@components/modal/AlertPromptModal';

interface UnsavedChangesPromptProps {
    open: boolean;
    onClose: () => void;
    onDiscard: () => void;
    onSave: () => void;
    saveLabel?: string;
    subtitle?: string;
    title?: string;
}

export default function UnsavedChangesPrompt({
    open,
    saveLabel = 'Save changes',
    subtitle = 'Save them before leaving, or discard them to leave without saving.',
    title = 'You have unsaved changes',
    onClose,
    onDiscard,
    onSave
}: UnsavedChangesPromptProps) {
    return (
        <AlertPromptModal
            formButtonsProps={{
                cancelProps: {
                    children: 'Discard',
                    color: 'error',
                    variant: 'outlined',
                    onClick: onDiscard
                },
                confirmProps: {
                    children: saveLabel,
                    onClick: onSave
                },
                resetProps: {
                    children: 'Keep editing',
                    color: 'inherit',
                    variant: 'text',
                    onClick: onClose
                }
            }}
            mainContent={{ title }}
            open={open}
            subContent={{ title: subtitle }}
            onClose={onClose}
        />
    );
}