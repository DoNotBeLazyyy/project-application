import CommonForm from '@components/form/CommonForm';
import { FormFieldConfig } from '@components/form/FormField';
import { MIN_PASSWORD_LENGTH } from '@pages/shared/profile/constants/profile.constant';
import { ComponentPropsForm } from '@type/common.type';
import { ChangePasswordFormValues } from '@type/profile.type';
import { Control, UseFormGetValues } from 'react-hook-form';

interface ChangePasswordFormProps extends ComponentPropsForm {
    control: Control<ChangePasswordFormValues>;
    getValues: UseFormGetValues<ChangePasswordFormValues>;
}

export default function ChangePasswordForm({
    control,
    getValues,
    ...formProps
}: ChangePasswordFormProps) {
    const fields: FormFieldConfig<ChangePasswordFormValues>[] = [
        {
            name: 'current_password',
            rules: { required: 'Current password is required' },
            type: 'password',
            fieldProps: { helperText: 'The password you use to sign in today.' }
        },
        {
            name: 'new_password',
            rules: {
                required: 'New password is required',
                minLength: {
                    value: MIN_PASSWORD_LENGTH,
                    message: `Must be at least ${MIN_PASSWORD_LENGTH} characters`
                },
                validate: function(value: string) {
                    return value !== getValues('current_password')
                        || 'New password must differ from the current one';
                }
            },
            type: 'password',
            fieldProps: { helperText: `At least ${MIN_PASSWORD_LENGTH} characters.` }
        },
        {
            name: 'confirm_password',
            rules: {
                required: 'Please confirm your new password',
                validate: function(value: string) {
                    return value === getValues('new_password')
                        || 'Passwords do not match';
                }
            },
            type: 'password',
            fieldProps: { helperText: 'Re-type the new password.' }
        }
    ];

    return <CommonForm
        control={control}
        fields={fields}
        formProps={formProps}
        hasHelper
    />;
}