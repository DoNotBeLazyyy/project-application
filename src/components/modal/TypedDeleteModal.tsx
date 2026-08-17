import CommonInput, { CommonInputProps } from '@components/input/CommonInput';
import CommonActionModal, { CommonActionModalProps } from '@components/modal/CommonActionModal';
import { classMerge } from '@utils/css.util';
import { ReactNode } from 'react';

export interface TypedDeletePromptModalProps extends CommonActionModalProps {
    inputProps?: CommonInputProps;
    modalContent?: ReactNode;
    modalHeader?: ReactNode;
}

export default function TypedDeletePromptModal({
    containerClassName,
    inputProps,
    formButtonsProps,
    modalContent,
    modalHeader,
    ...props
}: TypedDeletePromptModalProps) {
    const { cancelProps, confirmProps, className } = formButtonsProps ?? {};

    return (
        <CommonActionModal
            {...props}
            containerClassName={
                classMerge(
                    'flex flex-col gap-(--mui-tokens-spacing-8) max-w-full pt-(--mui-tokens-spacing-6) w-92',
                    containerClassName
                )
            }
            formButtonsProps={{
                ...formButtonsProps,
                cancelProps: {
                    children: 'Cancel',
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