import CommonActionModal, { CommonActionModalProps } from '@components/modal/CommonActionModal';
import { classMerge } from '@utils/css.util';
import { ReactNode } from 'react';

export interface CommonFormModalProps extends CommonActionModalProps {
    confirmText?: string;
    formContent?: ReactNode;
    formId?: string;
    isDirty?: boolean;
    onConfirmClose?: () => boolean;
    onReset?: () => void;
}

export default function CommonFormModal({
    confirmText = 'Save',
    containerClassName,
    formContent,
    formId,
    formButtonsProps,
    isDirty,
    onClose,
    onReset,
    ...props
}: CommonFormModalProps) {
    const { cancelProps, confirmProps, resetProps } = formButtonsProps ?? {};

    function handleCloseModal() {
        onClose?.({}, 'escapeKeyDown');
    }

    return (
        <CommonActionModal
            {...props}
            containerClassName={
                classMerge(
                    'max-w-full w-[40rem]',
                    containerClassName
                )
            }
            formButtonsProps={{
                ...formButtonsProps,
                cancelProps: {
                    color: 'secondary',
                    onClick: handleCloseModal,
                    ...cancelProps
                },
                confirmProps: {
                    children: confirmText,
                    disabled: isDirty === false,
                    form: formId,
                    type: formId
                        ? 'submit'
                        : 'button',
                    ...confirmProps
                },
                resetProps: onReset
                    ? {
                        children: 'Reset',
                        color: 'secondary',
                        variant: 'outlined',
                        onClick: onReset,
                        ...resetProps
                    }
                    : resetProps
            }}
        >
            {formContent}
        </CommonActionModal>
    );
}