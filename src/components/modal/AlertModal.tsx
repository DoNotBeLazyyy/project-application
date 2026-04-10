import CommonActionModal, { CommonActionModalProps } from '@components/modal/CommonActionModal';
import { WarningIcon } from '@phosphor-icons/react';
import { useTranslation } from 'react-i18next';

/**
 * AlertModal
 *
 * A specialized action modal used for warning or alert states. It pre-configures
 * the WarningIcon and provides default labels for the action.
 *
 * @example
 * <AlertModal
 *  open={true}
 *  onClose={handleClose}
 * />
 */
export default function AlertModal({
    actionIconProps,
    modalButtonProps,
    ...props
}: CommonActionModalProps) {
    const { t } = useTranslation(); // Translation hook
    const resolvedActionIconProps = {
        icon: WarningIcon,
        iconContainerClassName: 'bg-[var(--mui-tokens-color-state-warningLight)] text-[var(--mui-tokens-color-state-warning)]',
        ...actionIconProps
    }; // Resolved icon configuration
    const resolvedModalButtonProps = {
        ...modalButtonProps,
        confirmProps: {
            children: t('continue'),
            ...modalButtonProps?.confirmProps
        }
    }; // Resolved button properties

    return (
        <CommonActionModal
            actionIconProps={resolvedActionIconProps}
            modalButtonProps={resolvedModalButtonProps}
            {...props}
        />
    );
}