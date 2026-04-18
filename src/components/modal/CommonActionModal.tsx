import FormButtons, { FormButtonsProps } from '@components/button/FormButtons';
import CommonModal, { CommonModalProps } from '@components/modal/CommonModal';
import { classMerge } from '@utils/css.util';

export interface CommonActionModalProps extends CommonModalProps {
    containerClassName?: string;
    formButtonsProps?: FormButtonsProps;
}

export default function CommonActionModal({
    children,
    containerClassName,
    formButtonsProps,
    ...props
}: CommonActionModalProps) {
    const { cancelProps, className } = formButtonsProps ?? {};

    return (
        <CommonModal {...props}>
            <div
                className={
                    classMerge(
                        'flex flex-col gap-(--mui-tokens-spacing-8) pt-(--mui-tokens-spacing-5)',
                        containerClassName
                    )
                }
            >
                {children}
                <FormButtons
                    {...formButtonsProps}
                    cancelProps={{
                        children: 'Cancel',
                        ...cancelProps
                    }}
                    className={
                        classMerge(
                            'mt-auto w-full',
                            className
                        )
                    }
                />
            </div>
        </CommonModal>
    );
}