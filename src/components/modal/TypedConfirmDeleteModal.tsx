import { ModalButtonProps } from '@components/button/ModalButtons';
import CommonInput, { CommonInputProps } from '@components/input/CommonInput';
import BaseActionModal from '@components/modal/BaseActionModal';
import { CommonPromptModalProps } from '@components/modal/CommonPromptModal';
import { HTMLAttributesDivElement } from '@type/common.type';
import { classMerge } from '@utils/css.util';
import { normalizeSx } from '@utils/theme.util';
import { useTranslation } from 'react-i18next';

export interface TypedConfirmDeletePromptModalProps extends CommonPromptModalProps {
    // Props for the confirmation input field
    inputProps?: CommonInputProps;

    // Modal button props
    modalButtonProps?: ModalButtonProps;

    // Modal content container attributes
    modalContent?: HTMLAttributesDivElement;

    // Modal header container attributes
    modalHeader?: HTMLAttributesDivElement;
}

/**
 * TypedConfirmDeletePromptModal
 *
 * A specialized modal used for destructive confirmation workflows. It forces
 * the user to interact with a specific input field before proceeding with
 * a delete action.
 *
 * @example
 * <TypedConfirmDeletePromptModal
 * inputProps={{ label: 'Type "DELETE" to confirm' }}
 * modalHeader={{ children: 'Confirm Deletion' }}
 * open={isOpen}
 * />
 */
export default function TypedConfirmDeletePromptModal({
    inputProps,
    modalButtonProps,
    modalContent,
    modalHeader,
    containerClassName,
    ...props
}: TypedConfirmDeletePromptModalProps) {
    const { t } = useTranslation(); // Translation hook

    return (
        <BaseActionModal
            {...props}
            containerClassName={
                classMerge(
                    'flex flex-col gap-(--mui-tokens-spacing-8) pt-(--mui-tokens-spacing-6) w-92',
                    containerClassName
                )
            }
            modalButtonProps={{
                ...modalButtonProps,
                cancelProps: {
                    children: t('cancel'),
                    ...modalButtonProps?.cancelProps
                },
                confirmProps: {
                    variant: 'outlined' as const,
                    sx: {
                        borderColor: 'var(--mui-tokens-color-state-error)',
                        color: 'var(--mui-tokens-color-state-error)',
                        ...normalizeSx(modalButtonProps?.confirmProps?.sx)
                    },
                    ...modalButtonProps?.confirmProps
                },
                className: classMerge(
                    'flex-col gap-2.5 flex-col-reverse',
                    modalButtonProps?.className
                )
            }}
        >
            {modalHeader && <div {...modalHeader} />}
            {modalContent && <div {...modalContent} />}
            <CommonInput
                {...inputProps}
                inputProps={{
                    size: 'small' as const,
                    variant: 'outlined' as const,
                    ...inputProps?.inputProps
                }}
                isRequired={true}
            />
        </BaseActionModal>
    );
}