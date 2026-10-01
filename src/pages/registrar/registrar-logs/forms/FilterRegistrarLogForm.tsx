import CommonForm from '@components/form/CommonForm';
import { FormFieldConfig } from '@components/form/FormField';
import { CommonSelectOption } from '@components/select/CommonSelect';
import { ComponentPropsForm } from '@type/common.type';
import { RegistrarLogFilterValues } from '@type/registrar-verification.type';
import { Control } from 'react-hook-form';

const ACTION_OPTIONS: CommonSelectOption[] = [
    { label: 'All Actions', value: 'All' },
    { label: 'Profile Change Requested', value: 'PROFILE_CHANGE_REQUESTED' },
    { label: 'Profile Approved', value: 'PROFILE_CHANGE_APPROVED' },
    { label: 'Profile Edited & Approved', value: 'PROFILE_CHANGE_EDITED_APPROVED' },
    { label: 'Profile Rejected', value: 'PROFILE_CHANGE_REJECTED' },
    { label: 'Rejected - False Information', value: 'PROFILE_REJECTED_FALSE_INFO' },
    { label: 'False Info Alert Sent', value: 'FALSE_INFO_NOTIFICATION_SENT' },
    { label: 'Profile Manually Edited', value: 'PROFILE_MANUALLY_EDITED' }
];

interface FilterRegistrarLogFormProps extends ComponentPropsForm {
    control: Control<RegistrarLogFilterValues>;
}

export default function FilterRegistrarLogForm({
    control,
    ...formProps
}: FilterRegistrarLogFormProps) {
    const fields: FormFieldConfig<RegistrarLogFilterValues>[] = [
        {
            name: 'action',
            options: ACTION_OPTIONS,
            type: 'select'
        },
        {
            name: 'date_from',
            type: 'date'
        },
        {
            name: 'date_to',
            type: 'date'
        }
    ];

    return (
        <CommonForm
            containerClassName="gap-4 flex flex-col"
            control={control}
            fields={fields}
            formProps={formProps}
        />
    );
}
