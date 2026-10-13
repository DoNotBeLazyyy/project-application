import CommonForm from '@components/form/CommonForm';
import { FormFieldConfig } from '@components/form/FormField';
import { ComponentPropsForm } from '@type/common.type';
import { DepartmentFormValues } from '@type/department.type';
import { generateDepartmentCode } from '@utils/entity-code.util';
import { useEffect } from 'react';
import { Control, UseFormSetValue, useWatch } from 'react-hook-form';

interface DepartmentFormProps extends ComponentPropsForm {
    control: Control<DepartmentFormValues>;
    disabled?: boolean;
    isCodeDisabled?: boolean;
    isCreate?: boolean;
    setValue?: UseFormSetValue<DepartmentFormValues>;
}

export function getDepartmentFormFields(
    disabled?: boolean,
    _isCodeDisabled?: boolean
): FormFieldConfig<DepartmentFormValues>[] {
    return [
        {
            disabled: true,
            fieldProps: { helperText: 'System-generated unique department code' },
            label: 'Department Code',
            name: 'code',
            rules: undefined,
            type: 'text'
        },
        {
            disabled,
            fieldProps: { helperText: 'Full department name' },
            label: 'Department Name',
            name: 'name',
            rules: disabled
                ? undefined
                : {
                    required: 'Department name is required',
                    validate: (val: any) => Boolean(val && String(val).trim()) || 'Department name cannot be empty or whitespace only'
                },
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
    isCreate = false,
    setValue,
    ...formProps
}: DepartmentFormProps) {
    const fields = getDepartmentFormFields(disabled, isCodeDisabled);
    const watchedName = useWatch({ control, name: 'name' });

    useEffect(() => {
        if (!setValue || disabled || !isCreate) return;
        const generated = generateDepartmentCode(watchedName || '');
        if (generated) {
            setValue('code', generated, { shouldValidate: true, shouldDirty: true });
        }
    }, [watchedName, disabled, isCreate, setValue]);

    return (
        <CommonForm
            control={control}
            fields={fields}
            formProps={formProps}
            hasHelper
        />
    );
}
