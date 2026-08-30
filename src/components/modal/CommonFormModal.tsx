import CommonActionModal, { CommonActionModalProps } from '@components/modal/CommonActionModal';
import { classMerge } from '@utils/css.util';
import { normalizeSx } from '@utils/theme.util';
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
    cardProps,
    confirmText = 'Save',
    containerClassName,
    formContent,
    formId,
    formButtonsProps,
    fullScreen,
    hideCancel = false,
    isDirty,
    sx,
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
            cardProps={{
                ...cardProps,
                // Header close (X). A page-supplied header action still wins.
                defaultActionProps: cardProps?.cardHeaderProps?.action
                    ? undefined
                    : { onClick: handleCloseModal, ...cardProps?.defaultActionProps }
            }}
            containerClassName={
                classMerge(
                    'w-full',
                    containerClassName
                )
            }
            formButtonsProps={{
                ...formButtonsProps,
                cancelProps: hideCancel
                    ? undefined
                    : {
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
            fullScreen={fullScreen}
            hideCancel={hideCancel}
            sx={[
                {
                    '& .MuiDialog-paper:not(.MuiDialog-paperFullScreen)': {
                        height: 'auto',
                        margin: 'auto',
                        maxHeight: { sm: '70%' },
                        maxWidth: { sm: '60%' },
                        overflow: 'hidden',
                        width: { sm: '60%' }
                    }
                },
                ...normalizeSx(sx)
            ]}
        >
            {formContent}
        </CommonActionModal>
    );
}