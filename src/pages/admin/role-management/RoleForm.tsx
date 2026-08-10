import CommonForm from '@components/form/CommonForm';
import { FormFieldConfig } from '@components/form/FormField';
import { ComponentPropsForm } from '@type/common.type';
import { CreateRoleFormValues } from '@type/role.type';
import { Control } from 'react-hook-form';

interface RoleFormProps extends ComponentPropsForm {
    control: Control<CreateRoleFormValues>;
    isCodeDisabled?: boolean;
    disabled?: boolean;
}

export default function RoleForm({
    control,
    disabled,
    isCodeDisabled,
    ...formProps
}: RoleFormProps) {
    const fields: FormFieldConfig<CreateRoleFormValues>[] = [
        {
            disabled: disabled || isCodeDisabled,
            fieldProps: { helperText: 'Letters, numbers and underscores, e.g. DEAN_SECRETARY' },
            name: 'code',
            rules: disabled || isCodeDisabled
                ? undefined
                : {
                    required: 'Role code is required',
                    pattern: {
                        value: /^[A-Za-z][A-Za-z0-9_]*$/,
                        message: 'Must start with a letter and use only letters, numbers or underscores'
                    }
                },
            type: 'text'
        },
        {
            disabled,
            fieldProps: { helperText: 'Display name shown across the system' },
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