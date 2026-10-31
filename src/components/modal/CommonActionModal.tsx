import FormButtons, { FormButtonsProps } from '@components/button/FormButtons';
import CommonModal, { CommonModalProps } from '@components/modal/CommonModal';
import useBreakpoint from '@hooks/useBreakpoint';
import { classMerge } from '@utils/css.util';
import { normalizeSx } from '@utils/theme.util';

export interface CommonActionModalProps extends CommonModalProps {
    containerClassName?: string;
    formButtonsProps?: FormButtonsProps;
    /** Suppress the Cancel button — e.g. read-only "view" modals have nothing to cancel. */
    hideCancel?: boolean;
}

export default function CommonActionModal({
    cardProps,
    children,
    containerClassName,
    formButtonsProps,
    hideCancel = false,
    onClose,
    ...props
}: CommonActionModalProps) {
    const { isMobile } = useBreakpoint();
    const isFullScreen = props.fullScreen ?? isMobile;
    const { cancelProps, className, confirmProps } = formButtonsProps ?? {};
    const isConfirmLoading = Boolean(confirmProps?.loading);

    const handleClose = (event: any, reason: any) => {
        if (isConfirmLoading) {
            return;
        }
        onClose?.(event, reason);
    };

    return (
        <CommonModal
            fullScreen={isFullScreen}
            {...props}
            onClose={handleClose}
            cardProps={{
                ...cardProps,
                defaultActionProps: cardProps?.defaultActionProps
                    ? {
                        ...cardProps.defaultActionProps,
                        onClick: (e: any) => {
                            if (isConfirmLoading) return;
                            cardProps.defaultActionProps?.onClick?.(e);
                        }
                    }
                    : undefined,
                sx: [
                    {
                        display: 'flex',
                        flexDirection: 'column',
                        // Halve the header / body / footer rhythm (medium card gap is 0.75rem).
                        gap: '0.375rem',
                        height: isFullScreen ? '100dvh' : 'auto',
                        maxHeight: isFullScreen
                            ? '100dvh'
                            : {
                                xs: 'calc(100dvh - 2rem)',
                                sm: 'calc(100dvh - 4rem)'
                            },
                        borderRadius: isFullScreen
                            ? 0
                            : 'var(--mui-tokens-radius-lg)',
                        overflow: 'hidden',
                        '& > .MuiCardHeader-root': {
                            display: 'flex',
                            flexDirection: 'row',
                            alignItems: 'flex-start',
                            justifyContent: 'space-between',
                            flexShrink: 0,
                            '& .MuiCardHeader-action': {
                                alignSelf: 'flex-start',
                                flexShrink: 0,
                                margin: 0
                            }
                        }
                    },
                    ...normalizeSx(cardProps?.sx)
                ]
            }}
        >
            <div
                className={
                    classMerge(
                        'flex flex-1 flex-col gap-2 min-h-0 pt-1 sm:gap-(--mui-tokens-spacing-5) sm:pt-(--mui-tokens-spacing-3)',
                        containerClassName
                    )
                }
            >
                <div className="flex-1 min-h-0 overflow-y-auto pr-1 sm:pr-3">
                    {children}
                </div>
                <FormButtons
                    {...formButtonsProps}
                    cancelProps={hideCancel
                        ? undefined
                        : {
                            children: 'Cancel',
                            color: 'secondary',
                            onClick: (e: any) => handleClose(e, 'backdropClick'),
                            variant: 'outlined',
                            disabled: isConfirmLoading,
                            ...cancelProps
                        }}
                    className={
                        classMerge(
                            'mt-auto shrink-0 w-full',
                            className
                        )
                    }
                />
            </div>
        </CommonModal>
    );
}