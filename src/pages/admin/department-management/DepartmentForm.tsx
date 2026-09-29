import CommonForm from '@components/form/CommonForm';
import { FormFieldConfig } from '@components/form/FormField';
import { ComponentPropsForm } from '@type/common.type';
import { DepartmentFormValues } from '@type/department.type';
import { Control } from 'react-hook-form';

interface DepartmentFormProps extends ComponentPropsForm {
    control: Control<DepartmentFormValues>;
    disabled?: boolean;
    isCodeDisabled?: boolean;
}

export default function DepartmentForm({
    control,
    disabled,
    isCodeDisabled,
    ...formProps
}: DepartmentFormProps) {
    const fields: FormFieldConfig<DepartmentFormValues>[] = [
        {
            disabled: disabled || isCodeDisabled,
            fieldProps: { helperText: 'Short unique code, e.g. CCS' },
            name: 'code',
            rules: disabled || isCodeDisabled
                ? undefined
                : { required: 'Department code is required' },
            type: 'text'
        },
        {
            disabled,
            fieldProps: { helperText: 'Full department name' },
            name: 'name',
            rules: disabled
                ? undefined
                : { required: 'Department name is required' },
            type: 'text'
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
            hasHelper
        />
    );
}
