import CommonForm from '@components/form/CommonForm';
import { FormFieldConfig } from '@components/form/FormField';
import { CommonSelectOption } from '@components/select/CommonSelect';
import { TERM_STATUS_OPTIONS } from '@constants/term.constant';
import { ComponentPropsForm } from '@type/common.type';
import { TermFilterValues } from '@type/term/term.type';
import { Control } from 'react-hook-form';

interface TermFilterFormProps extends ComponentPropsForm {
    control: Control<TermFilterValues>;
    schoolYearOptions: CommonSelectOption[];
}

export default function TermFilterForm({
    control,
    schoolYearOptions,
    ...formProps
}: TermFilterFormProps) {
    const fields: FormFieldConfig<TermFilterValues>[] = [
        {
            label: 'School Year',
            name: 'school_year_id',
            options: [{ label: 'All School Years', value: '' }, ...schoolYearOptions],
            type: 'select'
        },
        {
            label: 'Status',
            name: 'status',
            options: TERM_STATUS_OPTIONS,
            type: 'select'
        }
    ];

    return (
        <CommonForm
            containerClassName="flex flex-col gap-4"
            control={control}
            fields={fields}
            formProps={formProps}
        />
    );
}