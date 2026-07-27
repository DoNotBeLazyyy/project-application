import CommonForm from '@components/form/CommonForm';
import { FormFieldConfig } from '@components/form/FormField';
import { YEAR_LEVEL_OPTIONS } from '@constants/year-level.constant';
import { useProgramOptions } from '@pages/dean/program-management/useProgramOptions';
import { ComponentPropsForm } from '@type/common.type';
import { StudentFilterValues, StudentStatus } from '@type/student.type';
import { Control } from 'react-hook-form';

const STATUS_OPTIONS: { label: string; value: StudentStatus }[] = [
    { label: 'Active', value: 'Active' },
    { label: 'Inactive', value: 'Inactive' },
    { label: 'LOA', value: 'LOA' },
    { label: 'Graduated', value: 'Graduated' },
    { label: 'Expelled', value: 'Expelled' }
];

interface StudentFilterFormProps extends ComponentPropsForm {
    control: Control<StudentFilterValues>;
}

export default function StudentFilterForm({
    control,
    ...formProps
}: StudentFilterFormProps) {
    const { programOptions } = useProgramOptions();

    const fields: FormFieldConfig<StudentFilterValues>[] = [
        {
            name: 'program_ids',
            options: programOptions,
            type: 'multi-select'
        },
        {
            name: 'year_levels',
            options: YEAR_LEVEL_OPTIONS,
            type: 'multi-select'
        },
        {
            name: 'statuses',
            options: STATUS_OPTIONS,
            type: 'multi-select'
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