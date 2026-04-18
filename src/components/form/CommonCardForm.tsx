import FormButtons, { FormButtonsProps } from '@components/button/FormButtons';
import CommonCard, { CommonCardProps } from '@components/card/CommonCard';
import CommonForm, { CommonFormProps } from '@components/form/CommonForm';
import { classMerge } from '@utils/css.util';
import { FieldValues } from 'react-hook-form';

export interface CommonCardFormProps<T extends FieldValues> {
    cardProps: CommonCardProps;
    containerClassName?: string;
    formButtonsProps?: FormButtonsProps;
    formProps: CommonFormProps<T>;
}

export default function CommonCardForm<T extends FieldValues>({
    cardProps,
    containerClassName,
    formButtonsProps,
    formProps
}: CommonCardFormProps<T>) {
    const { className } = formButtonsProps ?? {};

    return (
        <CommonCard {...cardProps}>
            <div
                className={
                    classMerge(
                        'flex flex-col gap-(--mui-tokens-spacing-8) pt-(--mui-tokens-spacing-5)',
                        containerClassName
                    )
                }
            >
                <CommonForm {...formProps} />
                <FormButtons
                    {...formButtonsProps}
                    className={
                        classMerge(
                            'mt-auto w-full',
                            className
                        )
                    }
                />
            </div>
        </CommonCard>
    );
}