import CommonForm from '@components/form/CommonForm';
import { FormFieldConfig } from '@components/form/FormField';
import { useDepartmentOptions } from '@pages/dean/department-management/useDepartmentOptions';
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
            name: 'code',
            rules: disabled || isCodeDisabled
                ? undefined
                : { required: 'Required' },
            type: 'number',
            gridCols: 1
        },
        {
            disabled,
            name: 'name',
            rules: disabled
                ? undefined
                : { required: 'Required' },
            type: 'text',
            gridCols: 1
        },
        {
            disabled,
            name: 'department_id',
            options: departmentOptions,
            rules: disabled
                ? undefined
                : { required: 'Required' },
            type: 'select'
        },
        {
            disabled,
            name: 'program_level_id',
            options: programLevelOptions,
            rules: disabled
                ? undefined
                : { required: 'Required' },
            type: 'select'
        },
        {
            disabled,
            name: 'total_units',
            type: 'number'
        },
        {
            disabled,
            name: 'years_duration',
            rules: disabled
                ? undefined
                : {
                    required: 'Required',
                    min: { value: 1, message: 'Must be at least 1 year' },
                    max: { value: 8, message: 'Cannot exceed 8 years' }
                },
            type: 'number',
            fieldProps: {
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
            containerClassName="gap-4 grid grid-cols-2"
            control={control}
            fields={fields}
            formProps={formProps}
            hasHelper
        />
    );
}