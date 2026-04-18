import CommonPromptModal, { CommonPromptModalProps } from '@components/modal/CommonPromptModal';
import { CheckIcon } from '@phosphor-icons/react';

export default function ConfirmPromptModal({
    actionIconProps,
    formButtonsProps,
    ...props
}: CommonPromptModalProps) {
    return <CommonPromptModal
        {...props}
        actionIconProps={{
            icon: CheckIcon,
            iconContainerClassName: 'bg-(--mui-tokens-color-state-successLight) text-(--mui-tokens-color-state-success)',
            ...actionIconProps
        }}
        formButtonsProps={{
            ...formButtonsProps,
            confirmProps: {
                children: 'Proceed',
                ...formButtonsProps?.confirmProps
            }
        }}
    />;
}