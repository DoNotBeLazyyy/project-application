import CommonForm from '@components/form/CommonForm';
import { FormFieldConfig } from '@components/form/FormField';
import { CheckCircleIcon, ListChecksIcon, ScalesIcon } from '@phosphor-icons/react';
import { useDepartmentOptions } from '@pages/admin/department-management/useDepartmentOptions';
import { useProgramLevelOptions } from '@pages/dean/program-management/level/useProgramLevelOptions';
import ProgramGradingSchemaStep from '@pages/dean/program-management/ProgramGradingSchemaStep';
import { ComponentPropsForm } from '@type/common.type';
import { ProgramFormValues } from '@type/program/program.type';
import { useState } from 'react';
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
    const [activeStep, setActiveStep] = useState<number>(1);
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
            readOnly: disabled,
            fieldProps: {
                resize: 'vertical',
                rows: 3
            },
            name: 'description',
            type: 'text-area',
            gridCols: 2
        }
    ];

    const steps = [
        { id: 1, label: '1. Program Details', icon: ListChecksIcon },
        { id: 2, label: '2. Grading Schema', icon: ScalesIcon }
    ];

    return (
        <div className="flex flex-col gap-5">
            {/* Stepper Header Navigation */}
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                    {steps.map((step) => {
                        const Icon = step.icon;
                        const isActive = activeStep === step.id;

                        return (
                            <button
                                key={step.id}
                                type="button"
                                onClick={() => setActiveStep(step.id)}
                                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                                    isActive
                                        ? 'bg-blue-600 text-white shadow-sm'
                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                                }`}
                            >
                                <Icon className="w-4 h-4" />
                                <span>{step.label}</span>
                            </button>
                        );
                    })}
                </div>
                <span className="text-xs text-slate-400 font-medium">
                    Step {activeStep} of {steps.length}
                </span>
            </div>

            {/* Stepper Content */}
            {activeStep === 1 && (
                <CommonForm
                    containerClassName="gap-4 grid grid-cols-1 md:grid-cols-2"
                    control={control}
                    fields={fields}
                    formProps={formProps}
                    hasHelper
                />
            )}

            {activeStep === 2 && (
                <ProgramGradingSchemaStep
                    control={control}
                    disabled={disabled}
                />
            )}
        </div>
    );
}