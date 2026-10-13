import CommonForm from '@components/form/CommonForm';
import { FormFieldConfig } from '@components/form/FormField';
import { useDepartmentOptions } from '@pages/admin/department-management/useDepartmentOptions';
import { useRoleOptions } from '@pages/admin/role-management/hooks/useRoleOptions';
import { UserRole } from '@type/app.type';
import { ComponentPropsForm } from '@type/common.type';
import { UpdateUserFormValues } from '@type/user.type';
import { Control, useWatch } from 'react-hook-form';

interface UserFormProps extends ComponentPropsForm {
    control: Control<UpdateUserFormValues>;
    disabled?: boolean;
}

export default function UserForm({
    control,
    disabled,
    ...formProps
}: UserFormProps) {
    const { roleOptions } = useRoleOptions();
    const { departmentOptions } = useDepartmentOptions();
    const selectedRoles = useWatch({ control, name: 'role_codes' });
    const hasDeanRole = Array.isArray(selectedRoles) && selectedRoles.includes('Dean');

    const fields: FormFieldConfig<UpdateUserFormValues>[] = [
        {
            disabled,
            label: 'First Name',
            name: 'first_name',
            rules: disabled
                ? undefined
                : {
                    required: 'First name is required',
                    validate: (v: any) => Boolean(v && String(v).trim()) || 'First name cannot be empty or whitespace only'
                },
            type: 'text'
        },
        {
            disabled,
            label: 'Last Name',
            name: 'last_name',
            rules: disabled
                ? undefined
                : {
                    required: 'Last name is required',
                    validate: (v: any) => Boolean(v && String(v).trim()) || 'Last name cannot be empty or whitespace only'
                },
            type: 'text'
        },
        {
            disabled,
            label: 'Email',
            name: 'email',
            rules: disabled
                ? undefined
                : {
                    required: 'Required',
                    pattern: {
                        value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                        message: 'Invalid email address'
                    }
                },
            type: 'email'
        },
        {
            disabled,
            label: 'Roles',
            name: 'role_codes',
            options: roleOptions,
            rules: disabled
                ? undefined
                : {
                    validate: (value?: any) => (Array.isArray(value) && value.length > 0)
                        || 'Assign at least one role'
                },
            type: 'multi-select',
            fieldProps: {
                helperText: 'A user may hold several roles and switch between them in the sidebar.',
                placeholder: 'Select roles'
            }
        }
    ];

    if (hasDeanRole) {
        fields.push({
            disabled,
            label: 'Department',
            name: 'department_id',
            options: departmentOptions,
            rules: disabled
                ? undefined
                : { required: 'Department is required for Dean' },
            type: 'select',
            fieldProps: {
                helperText: 'Academic department governed by this Dean.'
            }
        });
    }

    return <CommonForm
        control={control}
        fields={fields}
        formProps={formProps}
        hasHelper
    />;
}