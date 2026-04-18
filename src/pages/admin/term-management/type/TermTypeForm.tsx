import CommonForm from '@components/form/CommonForm';
import { FormFieldConfig } from '@components/form/FormField';
import { ComponentPropsForm } from '@type/common.type';
import { TermTypeFormValues } from '@type/term/term-type.type';
import { Control } from 'react-hook-form';

interface TermTypeFormProps extends ComponentPropsForm {
    control: Control<TermTypeFormValues>;
    disabled?: boolean;
    isCodeDisabled?: boolean;
}

export default function TermTypeForm({
    control,
    disabled,
    isCodeDisabled,
    ...formProps
}: TermTypeFormProps) {
    const fields: FormFieldConfig<TermTypeFormValues>[] = [
        {
            disabled: disabled || isCodeDisabled,
            name: 'code',
            rules: disabled || isCodeDisabled
                ? undefined
                : { required: 'Required' },
            type: 'text'
        },
        {
            disabled,
            name: 'label',
            rules: disabled
                ? undefined
                : { required: 'Required' },
            type: 'text'
        },
        {
            disabled,
            name: 'sequence',
            rules: disabled
                ? undefined
                : {
                    required: 'Required',
                    min: { value: 1, message: 'Must be at least 1' }
                },
            type: 'number'
        },
        {
            disabled,
            name: 'description',
            type: 'text-area'
        }
    ];

    return (
        <CommonForm
            control={control}
            fields={fields}
            formProps={formProps}
        />
    );
}