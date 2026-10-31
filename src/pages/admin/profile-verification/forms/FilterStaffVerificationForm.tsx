import CommonForm from '@components/form/CommonForm';
import { FormFieldConfig } from '@components/form/FormField';
import { CommonSelectOption } from '@components/select/CommonSelect';
import { StaffProfileRequestFilterValues } from '@type/admin-verification.type';
import { ComponentPropsForm } from '@type/common.type';
import { Control } from 'react-hook-form';

const ROLE_OPTIONS: CommonSelectOption[] = [
    { label: 'All Roles', value: 'All' },
    { label: 'Dean', value: 'Dean' },
    { label: 'Faculty', value: 'Faculty' },
    { label: 'Registrar', value: 'Registrar' }
];

const STATUS_OPTIONS: CommonSelectOption[] = [
    { label: 'All Statuses', value: 'All' },
    { label: 'Pending Verification', value: 'Pending' },
    { label: 'Approved', value: 'Approved' },
    { label: 'Approved with Edits', value: 'Approved with Edits' },
    { label: 'Rejected', value: 'Rejected' },
    { label: 'Cancelled', value: 'Cancelled' }
];

interface FilterStaffVerificationFormProps extends ComponentPropsForm {
    control: Control<StaffProfileRequestFilterValues>;
}

export default function FilterStaffVerificationForm({
    control,
    ...formProps
}: FilterStaffVerificationFormProps) {
    const fields: FormFieldConfig<StaffProfileRequestFilterValues>[] = [
        {
            label: 'Staff Role',
            name: 'role_code',
            options: ROLE_OPTIONS,
            type: 'select'
        },
        {
            label: 'Status',
            name: 'status',
            options: STATUS_OPTIONS,
            type: 'select'
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