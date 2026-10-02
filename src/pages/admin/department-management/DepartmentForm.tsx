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

export function getDepartmentFormFields(
    disabled?: boolean,
    isCodeDisabled?: boolean
): FormFieldConfig<DepartmentFormValues>[] {
    return [
        {
            disabled: disabled || isCodeDisabled,
            fieldProps: { helperText: 'Short unique code, e.g. CCS' },
            label: 'Department Code',
            name: 'code',
            rules: disabled || isCodeDisabled
                ? undefined
                : { required: 'Department code is required' },
            type: 'text'
        },
        {
            disabled,
            fieldProps: { helperText: 'Full department name' },
            label: 'Department Name',
            name: 'name',
            rules: disabled
                ? undefined
                : { required: 'Department name is required' },
            type: 'text'
        },
        {
            disabled,
            label: 'Description',
            name: 'description',
            type: 'text-area'
        }
    ];
}

export default function DepartmentForm({
    control,
    disabled,
    isCodeDisabled,
    ...formProps
}: DepartmentFormProps) {
    const fields = getDepartmentFormFields(disabled, isCodeDisabled);

    return (
        <CommonForm
            control={control}
            fields={fields}
            formProps={formProps}
            hasHelper
        />
    );
}
