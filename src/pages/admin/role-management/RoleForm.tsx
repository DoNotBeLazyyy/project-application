import CommonForm from '@components/form/CommonForm';
import { FormFieldConfig } from '@components/form/FormField';
import { ComponentPropsForm } from '@type/common.type';
import { CreateRoleFormValues } from '@type/role.type';
import { generateRoleCode } from '@utils/entity-code.util';
import { useEffect } from 'react';
import { Control, UseFormSetValue, useWatch } from 'react-hook-form';

interface RoleFormProps extends ComponentPropsForm {
    control: Control<CreateRoleFormValues>;
    isCodeDisabled?: boolean;
    disabled?: boolean;
    isCreate?: boolean;
    setValue?: UseFormSetValue<CreateRoleFormValues>;
}

export function getRoleFormFields(
    disabled?: boolean,
    _isCodeDisabled?: boolean
): FormFieldConfig<CreateRoleFormValues>[] {
    return [
        {
            disabled: true,
            fieldProps: { helperText: 'System-generated unique role code' },
            label: 'Role Code',
            name: 'code',
            type: 'text'
        },
        {
            disabled,
            fieldProps: { helperText: 'Display name shown across the system' },
            label: 'Role Name',
            name: 'label',
            rules: disabled
                ? undefined
                : {
                    required: 'Role label is required',
                    pattern: {
                        value: /^(?=.*[A-Za-z]).{2,}$/,
                        message: 'Must be at least 2 characters and contain a letter'
                    }
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

export default function RoleForm({
    control,
    disabled,
    isCodeDisabled,
    isCreate = false,
    setValue,
    ...formProps
}: RoleFormProps) {
    const fields = getRoleFormFields(disabled, isCodeDisabled);
    const watchedLabel = useWatch({ control, name: 'label' });

    useEffect(() => {
        if (!setValue || disabled || !isCreate) return;
        const generated = generateRoleCode(watchedLabel || '');
        if (generated) {
            setValue('code', generated, { shouldValidate: true, shouldDirty: true });
        } else if (!watchedLabel?.trim()) {
            setValue('code', '', { shouldValidate: false, shouldDirty: false });
        }
    }, [watchedLabel, disabled, isCreate, setValue]);

    return (
        <CommonForm
            control={control}
            fields={fields}
            formProps={formProps}
            hasHelper
        />
    );
}