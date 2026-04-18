import CommonPromptModal, { CommonPromptModalProps } from '@components/modal/CommonPromptModal';
import { TrashIcon } from '@phosphor-icons/react';

export default function DeletePromptModal({
    actionIconProps,
    formButtonsProps,
    ...props
}: CommonPromptModalProps) {
    return <CommonPromptModal
        {...props}
        actionIconProps={{
            icon: TrashIcon,
            iconContainerClassName: 'bg-(--mui-tokens-color-red-200) text-(--mui-tokens-color-red-500)',
            ...actionIconProps
        }}
        formButtonsProps={{
            ...formButtonsProps,
            confirmProps: {
                children: 'Yes, Delete',
                color: 'error',
                ...formButtonsProps?.confirmProps
            }
        }}
    />;
}