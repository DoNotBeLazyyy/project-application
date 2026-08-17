import CommonForm from '@components/form/CommonForm';
import { FormFieldConfig } from '@components/form/FormField';
import { useRoleOptions } from '@pages/admin/role-management/hooks/useRoleOptions';
import { STATUS_OPTIONS } from '@pages/admin/user-management/constants/admin-user.constant';
import { ComponentPropsForm } from '@type/common.type';
import { UserFilterValues } from '@type/user.type';
import { Control } from 'react-hook-form';

interface FilterUserFormProps extends ComponentPropsForm {
    control: Control<UserFilterValues>;
}

export default function FilterUserForm({
    control,
    ...formProps
}: FilterUserFormProps) {
    const { roleOptions } = useRoleOptions({ withAllOption: true });
    const fields: FormFieldConfig<UserFilterValues>[] = [
        {
            name: 'role_code',
            type: 'select',
            options: roleOptions
        },
        {
            name: 'status',
            type: 'select',
            options: STATUS_OPTIONS
        },
        {
            name: 'city',
            type: 'text'
        },
        {
            name: 'province',
            type: 'text'
        }
    ];

    return (
        <CommonForm
            containerClassName="gap-4 grid grid-cols-1 md:grid-cols-2"
            control={control}
            fields={fields}
            formProps={formProps}
        />
    );
}