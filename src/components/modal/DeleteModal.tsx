import CommonActionModal, { CommonActionModalProps } from '@components/modal/CommonActionModal';
import { TrashIcon } from '@phosphor-icons/react';
import { useTranslation } from 'react-i18next';

/**
 * DeleteModal
 *
 * A specialized action modal strictly configured for destructive delete actions.
 * It wraps the CommonActionModal, automatically injecting the TrashIcon and
 * formatting the confirmation button to reflect an error state.
 *
 * @example
 * <DeleteModal
 *  open={true}
 *  onClose={handleClose}
 * />
 */
export default function DeleteModal({
    actionIconProps,
    modalButtonProps,
    ...props
}: CommonActionModalProps) {
    const { t } = useTranslation(); // Translation hook
    const resolvedActionIconProps = {
        icon: TrashIcon,
        iconContainerClassName: 'bg-(--mui-tokens-color-state-errorLight) text-(--mui-tokens-color-state-error)',
        ...actionIconProps
    }; // Resolved icon configuration
    const resolvedModalButtonProps = {
        ...modalButtonProps,
        confirmProps: {
            children: t('yes_delete'),
            sx: {
                backgroundColor: 'var(--mui-tokens-color-state-error)',
                '&:hover': { backgroundColor: 'var(--mui-tokens-color-state-error)' },
                '&:active': { backgroundColor: 'var(--mui-tokens-color-state-error)' },
                '&.Mui-disabled': { backgroundColor: 'var(--mui-tokens-color-state-error)' }
            },
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