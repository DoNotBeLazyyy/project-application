import CommonForm from '@components/form/CommonForm';
import { FormFieldConfig } from '@components/form/FormField';
import { useDepartmentOptions } from '@pages/admin/department-management/useDepartmentOptions';
import { useProgramLevelOptions } from '@pages/dean/program-management/level/useProgramLevelOptions';
import { ComponentPropsForm } from '@type/common.type';
import { ProgramFormValues } from '@type/program/program.type';
import { Control } from 'react-hook-form';

interface ProgramFormProps extends ComponentPropsForm {
    control: Control<ProgramFormValues>;
    disabled?: boolean;
    isCodeDisabled?: boolean;
}

export default function ProgramForm({
    control,
    disabled,
    isCodeDisabled,
    ...formProps
}: ProgramFormProps) {
    const { departmentOptions } = useDepartmentOptions();
    const { programLevelOptions } = useProgramLevelOptions();

    const fields: FormFieldConfig<ProgramFormValues>[] = [
        {
            disabled: disabled || isCodeDisabled,
            fieldProps: { helperText: 'Unique program code' },
            name: 'code',
            rules: disabled || isCodeDisabled
                ? undefined
                : { required: 'Program code is required' },
            type: 'text',
            gridCols: 1
        },
        {
            disabled,
            fieldProps: { helperText: 'Full program name, e.g. BS Computer Science' },
            name: 'name',
            rules: disabled
                ? undefined
                : { required: 'Program name is required' },
            type: 'text',
            gridCols: 1
        },
        {
            disabled,
            fieldProps: { helperText: 'Department that owns this program' },
            name: 'department_id',
            options: departmentOptions,
            rules: disabled
                ? undefined
                : { required: 'Please select a department' },
            type: 'select'
        },
        {
            disabled,
            fieldProps: { helperText: 'Academic level of the program' },
            name: 'program_level_id',
            options: programLevelOptions,
            rules: disabled
                ? undefined
                : { required: 'Please select a program level' },
            type: 'select'
        },
        {
            disabled,
            fieldProps: { helperText: 'Total units across the whole program (optional)' },
            name: 'total_units',
            type: 'number'
        },
        {
            disabled,
            name: 'years_duration',
            rules: disabled
                ? undefined
                : {
                    required: 'Number of years is required',
                    min: { value: 1, message: 'Must be at least 1 year' },
                    max: { value: 8, message: 'Cannot exceed 8 years' }
                },
            type: 'number',
            fieldProps: {
                helperText: 'Standard duration in years (1-8)',
                min: 2,
                max: 8
            }
        },
        {
            disabled,
            name: 'description',
            type: 'text-area',
            gridCols: 2
        }
    ];

    return (
        <CommonForm
            containerClassName="gap-4 grid grid-cols-1 md:grid-cols-2"
            control={control}
            fields={fields}
            formProps={formProps}
            hasHelper
        />
    );
}