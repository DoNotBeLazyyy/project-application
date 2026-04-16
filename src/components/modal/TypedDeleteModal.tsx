import CommonInput, { CommonInputProps } from '@components/input/CommonInput';
import CommonActionModal, { CommonActionModalProps } from '@components/modal/CommonActionModal';
import { classMerge } from '@utils/css.util';
import { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

export interface TypedDeletePromptModalProps extends CommonActionModalProps {
    // Props for the confirmation input field
    inputProps?: CommonInputProps;

    // Modal content container attributes
    modalContent?: ReactNode;

    // Modal header container attributes
    modalHeader?: ReactNode;
}

/**
 * TypedDeletePromptModal
 *
 * A specialized modal used for destructive confirmation workflows. It forces
 * the user to interact with a specific input field before proceeding with
 * a delete action.
 *
 * @example
 * <TypedDeletePromptModal
 *  inputProps={{ label: 'Type "DELETE" to confirm' }}
 *  modalHeader={{ children: 'Confirm Deletion' }}
 *  open={isOpen}
 * />
 */
export default function TypedDeletePromptModal({
    containerClassName,
    inputProps,
    modalButtonProps,
    modalContent,
    modalHeader,
    ...props
}: TypedDeletePromptModalProps) {
    const { t } = useTranslation(); // Translation hook
    const { cancelProps, confirmProps, className } = modalButtonProps ?? {}; // Destructured button properties

    return (
        <CommonActionModal
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
                    ...cancelProps
                },
                confirmProps: {
                    variant: 'outlined',
                    color: 'error',
                    ...confirmProps
                },
                className: classMerge(
                    'flex-col gap-2.5 flex-col-reverse',
                    className
                )
            }}
        >
            {modalHeader}
            {modalContent}
            <CommonInput
                isRequired={true}
                size="small"
                variant="outlined"
                {...inputProps}
            />
        </CommonActionModal>
    );
}