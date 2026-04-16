import CommonPromptModal, { CommonPromptModalProps } from '@components/modal/CommonPromptModal';
import { CheckIcon } from '@phosphor-icons/react';
import { useTranslation } from 'react-i18next';

/**
 * ConfirmPromptModal
 *
 * A specialized action modal used for confirmation states. It pre-configures
 * the CheckIcon and provides default labels for the action.
 *
 * @example
 * <ConfirmPromptModal
 *  open={true}
 *  onClose={handleClose}
 * />
 */
export default function ConfirmPromptModal({
    actionIconProps,
    modalButtonProps,
    ...props
}: CommonPromptModalProps) {
    const { t } = useTranslation(); // Translation hook

    return <CommonPromptModal
        {...props}
        actionIconProps={{
            icon: CheckIcon,
            iconContainerClassName: 'bg-(--mui-tokens-color-state-successLight) text-(--mui-tokens-color-state-success)',
            ...actionIconProps
        }}
        modalButtonProps={{
            ...modalButtonProps,
            confirmProps: {
                children: t('proceed'),
                ...modalButtonProps?.confirmProps
            }
        }}
    />;
}