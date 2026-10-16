import CommonForm from '@components/form/CommonForm';
import { FormFieldConfig } from '@components/form/FormField';
import { useDepartmentOptions } from '@pages/admin/department-management/useDepartmentOptions';
import { useProgramLevelOptions } from '@pages/dean/program-management/level/useProgramLevelOptions';
import { useAppStore } from '@stores/app.store';
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
    const activeRole = useAppStore((state) => state.activeRole);
    const isDean = activeRole === 'Dean';

    const fields: FormFieldConfig<ProgramFilterValues>[] = [
        ...(!isDean
            ? [{
                label: 'Departments',
                name: 'department_ids' as const,
                options: departmentOptions,
                type: 'multi-select' as const
            }]
            : []),
        {
            label: 'Program Levels',
            name: 'program_level_ids',
            options: programLevelOptions,
            type: 'multi-select'
        },
        {
            label: 'Status',
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