import CommonPromptModal, { CommonPromptModalProps } from '@components/modal/CommonPromptModal';
import { TrashIcon } from '@phosphor-icons/react';
import { useTranslation } from 'react-i18next';

/**
 * DeletePromptModal
 *
 * A specialized action modal strictly configured for destructive delete actions.
 * It wraps the CommonPromptModal, automatically injecting the TrashIcon and
 * formatting the confirmation button to reflect an error state.
 *
 * @example
 * <DeletePromptModal
 * open={true}
 * onClose={handleClose}
 * />
 */
export default function DeletePromptModal({
    actionIconProps,
    modalButtonProps,
    ...props
}: CommonPromptModalProps) {
    const { t } = useTranslation(); // Translation hook

    return <CommonPromptModal
        {...props}
        actionIconProps={{
            icon: TrashIcon,
            iconContainerClassName: 'bg-(--mui-tokens-color-red-200) text-(--mui-tokens-color-red-500)',
            ...actionIconProps
        }}
        modalButtonProps={{
            ...modalButtonProps,
            confirmProps: {
                children: t('yes_delete'),
                color: 'error',
                ...modalButtonProps?.confirmProps
            }
        }}
    />;
}