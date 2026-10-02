import CommonForm from '@components/form/CommonForm';
import { FormFieldConfig } from '@components/form/FormField';
import { ComponentPropsForm } from '@type/common.type';
import { SchoolYearFilterValues } from '@type/school-year.type';
import { Control } from 'react-hook-form';

const IS_ACTIVE_OPTIONS = [
    { label: 'All', value: 'All' },
    { label: 'Active', value: 'true' },
    { label: 'Inactive', value: 'false' }
];

interface SchoolYearFilterFormProps extends ComponentPropsForm {
    control: Control<SchoolYearFilterValues>;
}

export default function SchoolYearFilterForm({
    control,
    ...formProps
}: SchoolYearFilterFormProps) {
    const fields: FormFieldConfig<SchoolYearFilterValues>[] = [
        {
            label: 'Status',
            name: 'is_active',
            options: IS_ACTIVE_OPTIONS,
            type: 'select'
        },
        {
            label: 'Year',
            name: 'year',
            placeholder: 'e.g. 2024',
            rules: {
                validate: (value) => {
                    if (!value) return true;
                    const num = Number(value);
                    if (isNaN(num) || !Number.isInteger(num)) return 'Must be a valid year';
                    if (num < 1900 || num > 2100) return 'Year must be between 1900 and 2100';
                    return true;
                }
            },
            type: 'number'
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