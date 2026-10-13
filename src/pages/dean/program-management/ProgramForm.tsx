import CommonButton from '@components/button/CommonButton';
import CommonForm from '@components/form/CommonForm';
import { FormFieldConfig } from '@components/form/FormField';
import {
    ArrowLeftIcon, ArrowRightIcon, CheckCircleIcon, ListChecksIcon, MapTrifoldIcon, ScalesIcon
} from '@phosphor-icons/react';
import { useDepartmentOptions } from '@pages/admin/department-management/useDepartmentOptions';
import CurriculumMapManagement from '@pages/dean/curriculum-map-management';
import { useProgramLevelOptions } from '@pages/dean/program-management/level/useProgramLevelOptions';
import ProgramGradingSchemaStep from '@pages/dean/program-management/ProgramGradingSchemaStep';
import { useAppStore } from '@stores/app.store';
import { ComponentPropsForm } from '@type/common.type';
import { ProgramFormValues } from '@type/program/program.type';
import { CurriculumMapEntry } from '@type/curriculum-map.type';
import { generateProgramCode } from '@utils/entity-code.util';
import { useEffect, useRef, useState } from 'react';
import { Control, useFormContext } from 'react-hook-form';

interface ProgramFormProps extends ComponentPropsForm {
    control: Control<ProgramFormValues>;
    disabled?: boolean;
    isCodeDisabled?: boolean;
    programId?: string;
}

export default function ProgramForm({
    control,
    disabled,
    isCodeDisabled,
    programId,
    ...formProps
}: ProgramFormProps) {
    const { setValue, getValues, watch } = useFormContext<ProgramFormValues>();
    const selectedDepartmentId = watch('department_id');
    const [activeStep, setActiveStep] = useState<number>(1);
    const { departmentOptions } = useDepartmentOptions();
    const { programLevelOptions } = useProgramLevelOptions();

    const userProfile = useAppStore((state) => state.userProfile);
    const activeRole = useAppStore((state) => state.activeRole);
    const isDean = activeRole === 'Dean';

    const programName = watch('name');

    const hasInitializedDeptRef = useRef(false);
    useEffect(() => {
        if (!hasInitializedDeptRef.current && isDean && userProfile?.department_id && !getValues('department_id')) {
            hasInitializedDeptRef.current = true;
            setValue('department_id', userProfile.department_id, { shouldValidate: false });
        }
    }, [isDean, userProfile, setValue, getValues]);

    useEffect(() => {
        if (!programId && programName) {
            const currentCode = getValues('code');
            const generated = generateProgramCode(programName);
            if (generated && (!currentCode || currentCode !== generated)) {
                setValue('code', generated, { shouldValidate: true, shouldDirty: true });
            }
        }
    }, [programName, programId, setValue, getValues]);

    const fields: FormFieldConfig<ProgramFormValues>[] = [
        {
            disabled: true,
            fieldProps: { helperText: 'System-generated unique program code' },
            label: 'Program Code',
            name: 'code',
            type: 'text',
            gridCols: 1
        },
        {
            disabled,
            fieldProps: { helperText: 'Full program name, e.g. BS Computer Science' },
            label: 'Program Name',
            name: 'name',
            rules: disabled
                ? undefined
                : {
                    required: 'Program name is required',
                    validate: (val: any) => Boolean(val && String(val).trim()) || 'Program name cannot be empty or whitespace only'
                },
            type: 'text',
            gridCols: 1
        },
        {
            disabled: disabled || Boolean(isDean && userProfile?.department_id),
            fieldProps: { helperText: 'Department that owns this program' },
            label: 'Department',
            name: 'department_id',
            options: isDean && userProfile?.department_id
                ? departmentOptions.filter((d) => d.value === userProfile.department_id)
                : departmentOptions,
            rules: disabled
                ? undefined
                : { required: 'Please select a department' },
            type: 'select'
        },
        {
            disabled,
            fieldProps: { helperText: 'Academic level of the program' },
            label: 'Program Level',
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
            label: 'Total Units',
            name: 'total_units',
            type: 'number'
        },
        {
            disabled,
            label: 'Duration (Years)',
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
            label: 'Description',
            name: 'description',
            type: 'text-area',
            gridCols: 2
        }
    ];

    const steps = [
        { id: 1, label: '1. Program Details', icon: ListChecksIcon },
        { id: 2, label: '2. Grading Schema', icon: ScalesIcon },
        { id: 3, label: '3. Curriculum Map', icon: MapTrifoldIcon }
    ];

    return (
        <div className="flex flex-col flex-1 h-full min-h-[70vh] sm:min-h-0 justify-between gap-4">
            {/* Stepper Header Navigation */}
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3 shrink-0">
                <div className="flex items-center gap-2">
                    {steps.map((step) => {
                        const Icon = step.icon;
                        const isActive = activeStep === step.id;
                        const isDone = activeStep > step.id;

                        return (
                            <button
                                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                                    isActive
                                        ? 'bg-blue-600 text-white shadow-sm'
                                        : isDone
                                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                                }`}
                                key={step.id}
                                type="button"
                                onClick={() => setActiveStep(step.id)}
                            >
                                {isDone
                                    ? <CheckCircleIcon className="w-4 h-4" />
                                    : <Icon className="w-4 h-4" />}
                                <span>{step.label}</span>
                            </button>
                        );
                    })}
                </div>
                <span className="text-xs text-slate-400 font-medium">
                    Step {activeStep} of {steps.length}
                </span>
            </div>

            {/* Stepper Content Area (Takes Full Available Height in Mobile) */}
            <div className="flex-1 overflow-y-auto min-h-[380px] sm:min-h-0 pr-1">
                <div
                    style={{ display: activeStep === 1
                        ? 'block'
                        : 'none' }}>
                    <CommonForm
                        containerClassName="gap-4 grid grid-cols-1 md:grid-cols-2"
                        control={control}
                        fields={fields}
                        formProps={formProps}
                        hasHelper
                    />
                </div>

                <div
                    style={{ display: activeStep === 2
                        ? 'block'
                        : 'none' }}>
                    <ProgramGradingSchemaStep
                        control={control}
                        disabled={disabled}
                    />
                </div>

                <div
                    style={{ display: activeStep === 3
                        ? 'block'
                        : 'none' }}>
                    <CurriculumMapManagement
                        departmentId={selectedDepartmentId}
                        initialEntries={(getValues('curriculum_entries') as unknown as CurriculumMapEntry[]) || []}
                        programId={programId}
                        readOnly={disabled}
                        onChangeEntries={(newEntries, pendingDeleted) => {
                            setValue('curriculum_entries', newEntries as any, { shouldDirty: true });
                            if (pendingDeleted) {
                                setValue('pending_deleted_curriculum_ids', pendingDeleted as any, { shouldDirty: true });
                            }
                        }}
                    />
                </div>
            </div>

            {/* Stepper Footer Action Bar (Back / Next Navigation) */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-800 shrink-0">
                <CommonButton
                    color="inherit"
                    disabled={activeStep === 1}
                    size="small"
                    startIcon={<ArrowLeftIcon className="w-4 h-4" />}
                    type="button"
                    variant="outlined"
                    onClick={() => setActiveStep((prev) => Math.max(1, prev - 1))}
                >
                    Back
                </CommonButton>

                {activeStep < steps.length
                    ? (
                        <CommonButton
                            color="primary"
                            endIcon={<ArrowRightIcon className="w-4 h-4" />}
                            size="small"
                            type="button"
                            variant="contained"
                            onClick={() => setActiveStep((prev) => Math.min(steps.length, prev + 1))}
                        >
                            {activeStep === 1
                                ? 'Next: Grading Schema'
                                : 'Next: Curriculum Map'}
                        </CommonButton>
                    )
                    : (
                        <span className="text-xs text-slate-500 font-medium italic flex items-center gap-1.5">
                            <CheckCircleIcon className="w-4 h-4 text-emerald-500" /> Form complete
                        </span>
                    )}
            </div>
        </div>
    );
}