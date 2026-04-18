import CommonPromptModal, { CommonPromptModalProps } from '@components/modal/CommonPromptModal';
import { WarningIcon } from '@phosphor-icons/react';

export default function AlertPromptModal({
    actionIconProps,
    formButtonsProps,
    ...props
}: CommonPromptModalProps) {
    return <CommonPromptModal
        {...props}
        actionIconProps={{
            icon: WarningIcon,
            iconContainerClassName: 'bg-[var(--mui-tokens-color-200)] text-[var(--mui-tokens-color-500)]',
            ...actionIconProps
        }}
        formButtonsProps={{
            ...formButtonsProps,
            confirmProps: {
                children: 'Continue',
                ...formButtonsProps?.confirmProps
            }
        }}
    />;
}