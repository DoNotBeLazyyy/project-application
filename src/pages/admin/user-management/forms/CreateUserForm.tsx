import CommonForm from '@components/form/CommonForm';
import { FormFieldConfig } from '@components/form/FormField';
import { useDepartmentOptions } from '@pages/admin/department-management/useDepartmentOptions';
import { useRoleOptions } from '@pages/admin/role-management/hooks/useRoleOptions';
import { ComponentPropsForm } from '@type/common.type';
import { AddUserFormValues } from '@type/user.type';
import { Control, useWatch } from 'react-hook-form';

interface CreateUserFormProps extends ComponentPropsForm {
    control: Control<AddUserFormValues>;
    disabled?: boolean;
}

export default function CreateUserForm({
    control,
    disabled,
    ...formProps
}: CreateUserFormProps) {
    const { roleOptions } = useRoleOptions();
    const { departmentOptions } = useDepartmentOptions();
    const selectedRole = useWatch({ control, name: 'role_code' });

    const fields: FormFieldConfig<AddUserFormValues>[] = [
        {
            disabled,
            label: 'First Name',
            name: 'first_name',
            type: 'text',
            rules: { required: 'Required' }
        },
        {
            disabled,
            label: 'Last Name',
            name: 'last_name',
            type: 'text',
            rules: { required: 'Required' }
        },
        {
            disabled,
            label: 'Email',
            name: 'email',
            type: 'email',
            rules: { required: 'Required' }
        },
        {
            disabled,
            label: 'Role',
            name: 'role_code',
            type: 'select',
            options: roleOptions,
            rules: { required: 'Required' }
        }
    ];

    if (selectedRole === 'Dean') {
        fields.push({
            disabled,
            label: 'Department',
            name: 'department_id',
            type: 'select',
            options: departmentOptions,
            rules: { required: 'Department is required for Dean' },
            fieldProps: { helperText: 'Department governed by this Dean.' }
        });
    }

    return (
        <CommonForm
            control={control}
            fields={fields}
            formProps={formProps}
            hasHelper
        />
    );
}