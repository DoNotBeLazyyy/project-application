import CommonForm from '@components/form/CommonForm';
import { FormFieldConfig } from '@components/form/FormField';
import { useDepartmentOptions } from '@pages/dean/department-management/useDepartmentOptions';
import { useProgramLevelOptions } from '@pages/dean/program-management/level/useProgramLevelOptions';
import { ComponentPropsForm } from '@type/common.type';
import { ProgramFilterValues } from '@type/program/program.type';
import { Control } from 'react-hook-form';

const ACTIVE_OPTIONS = [
    { label: 'All', value: 'All' },
    { label: 'Active', value: 'true' },
    { label: 'Inactive', value: 'false' }
];

interface ProgramFilterFormProps extends ComponentPropsForm {
    control: Control<ProgramFilterValues>;
}

export default function ProgramFilterForm({
    control,
    ...formProps
}: ProgramFilterFormProps) {
    const { departmentOptions } = useDepartmentOptions();
    const { programLevelOptions } = useProgramLevelOptions();

    const fields: FormFieldConfig<ProgramFilterValues>[] = [
        {
            name: 'department_ids',
            options: departmentOptions,
            type: 'multi-select'
        },
        {
            name: 'program_level_ids',
            options: programLevelOptions,
            type: 'multi-select'
        },
        {
            name: 'is_active',
            options: ACTIVE_OPTIONS,
            type: 'select'
        }
    ];

    return (
        <CommonForm
            control={control}
            fields={fields}
            formProps={formProps}
        />
    );
}