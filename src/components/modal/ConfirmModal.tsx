import CommonActionModal, { CommonActionModalProps } from '@components/modal/CommonActionModal';
import { CheckIcon } from '@phosphor-icons/react';
import { useTranslation } from 'react-i18next';

/**
 * ConfirmModal
 *
 * A specialized action modal used for confirmation states. It pre-configures
 * the CheckIcon and provides default labels for the action.
 *
 * @example
 * <ConfirmModal
 *  open={true}
 *  onClose={handleClose}
 * />
 */
export default function ConfirmModal({
    actionIconProps,
    modalButtonProps,
    ...props
}: CommonActionModalProps) {
    const { t } = useTranslation(); // Translation hook
    const resolvedActionIconProps = {
        icon: CheckIcon,
        iconContainerClassName: 'bg-[var(--mui-tokens-color-state-successLight)] text-[var(--mui-tokens-color-state-success)]',
        ...actionIconProps
    }; // Resolved icon configuration
    const resolvedModalButtonProps = {
        ...modalButtonProps,
        confirmProps: {
            children: t('proceed'),
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