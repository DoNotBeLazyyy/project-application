import CommonForm from '@components/form/CommonForm';
import { FormFieldConfig } from '@components/form/FormField';
import { useRoleOptions } from '@pages/admin/role-management/hooks/useRoleOptions';
import { UserRole } from '@type/app.type';
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
            label: 'First Name',
            name: 'first_name',
            rules: disabled
                ? undefined
                : { required: 'Required' },
            type: 'text'
        },
        {
            disabled,
            label: 'Last Name',
            name: 'last_name',
            rules: disabled
                ? undefined
                : { required: 'Required' },
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
                    validate: function(value: string | UserRole[]) {
                        return (Array.isArray(value) && value.length > 0)
                            || 'Assign at least one role';
                    }
                },
            type: 'multi-select',
            fieldProps: {
                helperText: 'A user may hold several roles and switch between them in the sidebar.',
                placeholder: 'Select roles'
            }
        }
    ];

    return <CommonForm
        control={control}
        fields={fields}
        formProps={formProps}
        hasHelper
    />;
}