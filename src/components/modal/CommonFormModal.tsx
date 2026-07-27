import CommonActionModal, { CommonActionModalProps } from '@components/modal/CommonActionModal';
import { classMerge } from '@utils/css.util';
import { ReactNode } from 'react';

export interface CommonFormModalProps extends CommonActionModalProps {
    confirmText?: string;
    formContent?: ReactNode;
    formId?: string;
    onConfirmClose?: () => boolean;
    onReset?: () => void;
}

export default function CommonFormModal({
    confirmText = 'Save',
    containerClassName,
    formContent,
    formId,
    formButtonsProps,
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
                    'w-[40rem]',
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