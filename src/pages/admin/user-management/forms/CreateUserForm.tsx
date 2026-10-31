import CommonForm from '@components/form/CommonForm';
import { FormFieldConfig } from '@components/form/FormField';
import { useRoleOptions } from '@pages/admin/role-management/hooks/use-role-options';
import { ComponentPropsForm } from '@type/common.type';
import { AddUserFormValues } from '@type/user.type';
import { Control } from 'react-hook-form';

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

    const fields: FormFieldConfig<AddUserFormValues>[] = [
        {
            disabled,
            label: 'First Name',
            name: 'first_name',
            type: 'text',
            rules: {
                required: 'First name is required',
                validate: (v: unknown) => Boolean(v && String(v)
                    .trim()) || 'First name cannot be empty or whitespace only'
            }
        },
        {
            disabled,
            label: 'Last Name',
            name: 'last_name',
            type: 'text',
            rules: {
                required: 'Last name is required',
                validate: (v: unknown) => Boolean(v && String(v)
                    .trim()) || 'Last name cannot be empty or whitespace only'
            }
        },
        {
            disabled,
            label: 'Email',
            name: 'email',
            type: 'email',
            rules: { required: 'Email is required' }
        },
        {
            disabled,
            label: 'Role',
            name: 'role_code',
            type: 'select',
            options: roleOptions,
            rules: { required: 'Role is required' }
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