import CommonPromptModal, { CommonPromptModalProps } from '@components/modal/CommonPromptModal';
import { WarningIcon } from '@phosphor-icons/react';

export default function AlertPromptModal({
    actionIconProps,
    formButtonsProps,
    ...props
}: CommonPromptModalProps) {
    return (
        <CommonPromptModal
            {...props}
            actionIconProps={{
                icon: WarningIcon,
                iconContainerClassName: 'bg-(--mui-tokens-color-state-warningLight) text-(--mui-tokens-color-state-warning)',
                ...actionIconProps
            }}
            formButtonsProps={{
                ...formButtonsProps,
                confirmProps: {
                    children: 'Continue',
                    ...formButtonsProps?.confirmProps
                }
            }}
        />
    );
}