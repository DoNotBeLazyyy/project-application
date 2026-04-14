import { ModalButtonProps } from '@components/button/ModalButtons';
import CommonInput, { CommonInputProps } from '@components/input/CommonInput';
import BaseActionModal from '@components/modal/BaseActionModal';
import { CommonActionModalProps } from '@components/modal/CommonActionModal';
import { HTMLAttributesDivElement } from '@type/common.type';
import { classMerge } from '@utils/css.util';
import { normalizeSx } from '@utils/theme.util';
import { useTranslation } from 'react-i18next';

export interface TypedConfirmDeleteModalProps extends CommonActionModalProps {
    // Props for the confirmation input field
    inputProps?: CommonInputProps;

    // Modal button props
    modalButtonProps?: ModalButtonProps;

    // Modal header
    modalContent?: HTMLAttributesDivElement;

    // Modal header
    modalHeader?: HTMLAttributesDivElement;
}

/**
 * TypedConfirmDeleteModal
 *
 * A specialized modal used for destructive confirmation workflows. It forces
 * the user to interact with a specific input field before proceeding with
 * a delete action.
 *
 * @example
 * <TypedConfirmDeleteModal
 *  inputProps={{ label: 'Type "DELETE" to confirm' }}
 *  modalHeader={{ children: 'Confirm Deletion' }}
 *  open={isOpen}
 * />
 */
export default function TypedConfirmDeleteModal({
    inputProps,
    modalButtonProps,
    modalContent,
    modalHeader,
    containerClassName,
    ...props
}: TypedConfirmDeleteModalProps) {
    const { t } = useTranslation(); // Translation hook
    const resolvedInputProps = {
        ...inputProps,
        inputProps: {
            size: 'small' as const,
            variant: 'outlined' as const,
            ...inputProps?.inputProps
        },
        isRequired: true
    }; // Merged input configuration
    const resolvedCancelProps = {
        children: t('cancel'),
        ...modalButtonProps?.cancelProps
    }; // Finalized cancel button props
    const resolvedConfirmProps = {
        variant: 'outlined' as const,
        ...modalButtonProps?.confirmProps,
        sx: {
            borderColor: 'var(--mui-tokens-color-state-error)',
            color: 'var(--mui-tokens-color-state-error)',
            ...normalizeSx(modalButtonProps?.confirmProps?.sx)
        }
    }; // Finalized confirm button props with error state styling
    const resolvedModalButtonClassName = classMerge(
        'flex-col gap-[10px] flex-col-reverse',
        modalButtonProps?.className
    ); // Resolved modal button class name
    const resolvedModalButtonProps = {
        ...modalButtonProps,
        cancelProps: resolvedCancelProps,
        confirmProps: resolvedConfirmProps,
        className: resolvedModalButtonClassName
    }; // Grouped button configuration

    return (
        <BaseActionModal
            {...props}
            containerClassName={
                classMerge(
                    'flex flex-col gap-(--mui-tokens-spacing-8) pt-(--mui-tokens-spacing-6) w-[23rem]',
                    containerClassName
                )
            }
            modalButtonProps={resolvedModalButtonProps}
        >
            {modalHeader && <div {...modalHeader} />}
            {modalContent && <div {...modalContent} />}
            <CommonInput {...resolvedInputProps} />
        </BaseActionModal>
    );
}