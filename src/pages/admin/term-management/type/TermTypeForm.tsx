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
            fieldProps: { helperText: 'Unique identifier, e.g. SEM-1, SEM-2, SUMMER' },
            label: 'Code',
            name: 'code',
            placeholder: 'e.g. SEM-1',
            rules: disabled || isCodeDisabled
                ? undefined
                : { required: 'Code is required' },
            type: 'text'
        },
        {
            disabled,
            fieldProps: { helperText: 'Full display name of this academic term type' },
            label: 'Term Type Name',
            name: 'label',
            placeholder: 'e.g. 1st Semester',
            rules: disabled
                ? undefined
                : { required: 'Term type name is required' },
            type: 'text'
        },
        {
            disabled,
            fieldProps: { helperText: 'Optional description of this academic term' },
            label: 'Description',
            name: 'description',
            placeholder: 'e.g. Regular first academic semester',
            type: 'text-area'
        }
    ];

    return (
        <CommonForm
            control={control}
            fields={fields}
            formProps={formProps}
            hasHelper
        />
    );
}