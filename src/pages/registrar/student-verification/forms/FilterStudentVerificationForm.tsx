import CommonForm from '@components/form/CommonForm';
import { FormFieldConfig } from '@components/form/FormField';
import { CommonSelectOption } from '@components/select/CommonSelect';
import { ComponentPropsForm } from '@type/common.type';
import { StudentProfileRequestFilterValues } from '@type/registrar-verification.type';
import { Control } from 'react-hook-form';

const STATUS_OPTIONS: CommonSelectOption[] = [
    { label: 'All Statuses', value: 'All' },
    { label: 'Pending Verification', value: 'Pending' },
    { label: 'Approved', value: 'Approved' },
    { label: 'Approved with Edits', value: 'Approved with Edits' },
    { label: 'Rejected', value: 'Rejected' }
];

interface FilterStudentVerificationFormProps extends ComponentPropsForm {
    control: Control<StudentProfileRequestFilterValues>;
}

export default function FilterStudentVerificationForm({
    control,
    ...formProps
}: FilterStudentVerificationFormProps) {
    const fields: FormFieldConfig<StudentProfileRequestFilterValues>[] = [
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
