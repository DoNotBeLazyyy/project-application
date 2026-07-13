import CommonForm from '@components/form/CommonForm';
import { FormFieldConfig } from '@components/form/FormField';
import { CIVIL_STATUS_OPTIONS, GENDER_OPTIONS } from '@pages/shared/profile/constants/profile.constant';
import { ComponentPropsForm } from '@type/common.type';
import { ProfileFormValues } from '@type/profile.type';
import { Control } from 'react-hook-form';

interface ProfileDetailsFormProps extends ComponentPropsForm {
    control: Control<ProfileFormValues>;
}

export default function ProfileDetailsForm({
    control,
    ...formProps
}: ProfileDetailsFormProps) {
    const fields: FormFieldConfig<ProfileFormValues>[] = [
        {
            name: 'first_name',
            rules: { required: 'First name is required' },
            type: 'text',
            fieldProps: { helperText: 'Your legal given name.' }
        },
        {
            name: 'middle_name',
            type: 'text',
            fieldProps: { helperText: 'Optional.' }
        },
        {
            name: 'last_name',
            rules: { required: 'Last name is required' },
            type: 'text',
            fieldProps: { helperText: 'Your legal family name.' }
        },
        {
            name: 'suffix',
            type: 'text',
            fieldProps: { helperText: 'Jr., Sr., III — optional.' }
        },
        {
            name: 'preferred_name',
            type: 'text',
            fieldProps: { helperText: 'How you would like to be addressed.' }
        },
        {
            name: 'mobile_number',
            type: 'text',
            fieldProps: { helperText: 'Reachable contact number.' }
        },
        {
            name: 'date_of_birth',
            type: 'date',
            fieldProps: { disableFuture: true }
        },
        {
            name: 'gender',
            options: GENDER_OPTIONS,
            type: 'select'
        },
        {
            name: 'civil_status',
            options: CIVIL_STATUS_OPTIONS,
            type: 'select'
        },
        {
            name: 'nationality',
            type: 'text',
            fieldProps: { helperText: 'Country of citizenship.' }
        },
        {
            name: 'address_line1',
            type: 'text',
            fieldProps: { helperText: 'House or unit number and street.' }
        },
        {
            name: 'address_line2',
            type: 'text',
            fieldProps: { helperText: 'Barangay, subdivision — optional.' }
        },
        {
            name: 'city',
            type: 'text',
            fieldProps: { helperText: 'City or municipality.' }
        },
        {
            name: 'province',
            type: 'text',
            fieldProps: { helperText: 'Province.' }
        },
        {
            name: 'postal_code',
            type: 'text',
            fieldProps: { helperText: 'ZIP code.' }
        }
    ];

    return <CommonForm
        containerClassName="gap-4 grid grid-cols-1 md:grid-cols-2"
        control={control}
        fields={fields}
        formProps={formProps}
        hasHelper
    />;
}