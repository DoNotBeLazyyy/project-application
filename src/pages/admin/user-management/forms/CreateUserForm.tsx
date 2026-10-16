import CommonForm from '@components/form/CommonForm';
import { FormFieldConfig } from '@components/form/FormField';
import { useRoleOptions } from '@pages/admin/role-management/hooks/useRoleOptions';
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

    return (
        <CommonForm
            control={control}
            fields={fields}
            formProps={formProps}
            hasHelper
        />
    );
}