import FormButtons, { FormButtonsProps } from '@components/button/FormButtons';
import CommonModal, { CommonModalProps } from '@components/modal/CommonModal';
import { classMerge } from '@utils/css.util';
import { normalizeSx } from '@utils/theme.util';

export interface CommonActionModalProps extends CommonModalProps {
    containerClassName?: string;
    formButtonsProps?: FormButtonsProps;
}

export default function CommonActionModal({
    cardProps,
    children,
    containerClassName,
    formButtonsProps,
    ...props
}: CommonActionModalProps) {
    const { cancelProps, className } = formButtonsProps ?? {};

    return (
        <CommonModal
            {...props}
            cardProps={{
                ...cardProps,
                sx: [
                    {
                        display: 'flex',
                        flexDirection: 'column',
                        overflow: 'hidden'
                    },
                    ...normalizeSx(cardProps?.sx)
                ]
            }}
        >
            <div
                className={
                    classMerge(
                        'flex flex-1 flex-col gap-(--mui-tokens-spacing-8) min-h-0 pt-(--mui-tokens-spacing-5)',
                        containerClassName
                    )
                }
            >
                <div className="flex-1 min-h-0 overflow-y-auto">
                    {children}
                </div>
                <FormButtons
                    {...formButtonsProps}
                    cancelProps={{
                        children: 'Cancel',
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