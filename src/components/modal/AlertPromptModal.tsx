import CommonPromptModal, { CommonPromptModalProps } from '@components/modal/CommonPromptModal';
import { WarningIcon } from '@phosphor-icons/react';
import { useTranslation } from 'react-i18next';

/**
 * AlertPromptModal
 *
 * A specialized action modal used for warning or alert states. It pre-configures
 * the WarningIcon and provides default labels for the action.
 *
 * @example
 * <AlertPromptModal
 *  open={true}
 *  onClose={handleClose}
 * />
 */
export default function AlertPromptModal({
    actionIconProps,
    modalButtonProps,
    ...props
}: CommonPromptModalProps) {
    const { t } = useTranslation(); // Translation hook

    return <CommonPromptModal
        {...props}
        actionIconProps={{
            icon: WarningIcon,
            iconContainerClassName: 'bg-[var(--mui-tokens-color-200)] text-[var(--mui-tokens-color-500)]',
            ...actionIconProps
        }}
        modalButtonProps={{
            ...modalButtonProps,
            confirmProps: {
                children: t('continue'),
                ...modalButtonProps?.confirmProps
            }
        }}
    />;
}