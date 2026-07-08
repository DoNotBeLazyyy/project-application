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
            name: 'code',
            rules: disabled || isCodeDisabled
                ? undefined
                : { required: 'Required' },
            type: 'text'
        },
        {
            disabled,
            name: 'label',
            rules: disabled
                ? undefined
                : { required: 'Required' },
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