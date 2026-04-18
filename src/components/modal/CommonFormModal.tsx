import CommonActionModal, { CommonActionModalProps } from '@components/modal/CommonActionModal';
import { classMerge } from '@utils/css.util';
import { ReactNode } from 'react';

export interface CommonFormModalProps extends CommonActionModalProps {
    confirmText?: string;
    formContent?: ReactNode;
    formId?: string;
    onConfirmClose?: () => boolean;
}

export default function CommonFormModal({
    confirmText = 'Save',
    containerClassName,
    formContent,
    formId,
    formButtonsProps,
    onClose,
    ...props
}: CommonFormModalProps) {
    const { cancelProps, confirmProps } = formButtonsProps ?? {};

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
                }
            }}
        >
            {formContent}
        </CommonActionModal>
    );
}