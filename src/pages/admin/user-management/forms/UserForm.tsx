import CommonForm from '@components/form/CommonForm';
import { FormFieldConfig } from '@components/form/FormField';
import { useRoleOptions } from '@pages/admin/role-management/hooks/useRoleOptions';
import { ComponentPropsForm } from '@type/common.type';
import { UpdateUserFormValues } from '@type/user.type';
import { Control } from 'react-hook-form';

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

    const fields: FormFieldConfig<UpdateUserFormValues>[] = [
        {
            disabled,
            name: 'first_name',
            rules: disabled
                ? undefined
                : { required: 'Required' },
            type: 'text'
        },
        {
            disabled,
            name: 'last_name',
            rules: disabled
                ? undefined
                : { required: 'Required' },
            type: 'text'
        },
        {
            disabled: true,
            name: 'email',
            type: 'email'
        },
        {
            disabled,
            name: 'role_code',
            options: roleOptions,
            type: 'select'
        }
    ];

    return <CommonForm
        control={control}
        fields={fields}
        formProps={formProps}
    />;
}