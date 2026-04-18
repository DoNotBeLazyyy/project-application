import CommonForm from '@components/form/CommonForm';
import { FormFieldConfig } from '@components/form/FormField';
import { useRoleOptions } from '@pages/admin/role-management/hooks/useRoleOptions';
import { ComponentPropsForm } from '@type/common.type';
import { AddUserFormValues } from '@type/user.type';
import { Control } from 'react-hook-form';

interface CreateUserFormProps extends ComponentPropsForm {
    control: Control<AddUserFormValues>;
}

export default function CreateUserForm({
    control,
    ...formProps
}: CreateUserFormProps) {
    const { roleOptions } = useRoleOptions({ withAllOption: true });
    const fields: FormFieldConfig<AddUserFormValues>[] = [
        {
            name: 'first_name',
            type: 'text',
            rules: { required: 'Required' }
        },
        {
            name: 'last_name',
            type: 'text',
            rules: { required: 'Required' }
        },
        {
            name: 'email',
            type: 'email',
            rules: { required: 'Required' }
        },
        {
            name: 'role_code',
            type: 'select',
            options: roleOptions
        }
    ];

    return (
        <CommonForm
            control={control}
            fields={fields}
            formProps={formProps}
        />
    );
}