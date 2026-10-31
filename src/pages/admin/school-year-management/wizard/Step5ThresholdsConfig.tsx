import CommonButton from '@components/button/CommonButton';
import ValidCommonCheckbox from '@components/checkbox/ValidCommonCheckbox';
import FormLabel from '@components/form/FormLabel';
import ValidCommonInput from '@components/input/ValidCommonInput';
import ValidCommonNumberInput from '@components/input/ValidCommonNumberInput';
import DeletePromptModal from '@components/modal/DeletePromptModal';
import ValidCommonSelect from '@components/select/ValidCommonSelect';
import CommonInfoTooltip from '@components/tooltip/CommonInfoTooltip';
import { NUMERIC_4_2_MAX } from '@pages/admin/school-year-management/wizard/wizard.constants';
import {
    CaretDownIcon,
    InfoIcon,
    PlusIcon,
    TrashIcon
} from '@phosphor-icons/react';
import { AcademicThresholdCategory } from '@type/academic-threshold.type';
import { AcademicYearWizardFormValues, WizardThresholdItem } from '@type/school-year.type';
import { generateAcademicThresholdCode } from '@utils/entity-code.util';
import { clearFieldError } from '@utils/form.util';
import { useEffect, useState } from 'react';
import {
    Control, useFieldArray, useFormState, UseFormSetValue, useWatch
} from 'react-hook-form';

interface Step5ThresholdsConfigProps {
    control: Control<AcademicYearWizardFormValues>;
    disabled?: boolean;
    setValue: UseFormSetValue<AcademicYearWizardFormValues>;
}

const CATEGORY_OPTIONS: { label: string; value: AcademicThresholdCategory }[] = [
    { label: 'Honor (Latin Honors)', value: 'Honor' },
    { label: 'Scholarship (Academic Qualification)', value: 'Scholarship' },
    { label: 'Academic Standing (Retention & Status)', value: 'Standing' }
];

export default function Step5ThresholdsConfig({
    control,
    disabled = false,
    setValue
}: Step5ThresholdsConfigProps) {
    const [deleteThresholdTarget, setDeleteThresholdTarget] = useState<{ index: number; label: string } | null>(null);
    const [collapsedThresholds, setCollapsedThresholds] = useState<Record<number, boolean>>({});

    const { errors } = useFormState({ control });

    useEffect(() => {
        if (errors.thresholds && Array.isArray(errors.thresholds)) {
            errors.thresholds.forEach((thErr, idx) => {
                if (thErr) {
                    setCollapsedThresholds((prev) => ({ ...prev, [idx]: false }));
                }
            });
        }
    }, [errors]);

    function toggleThresholdCollapse(index: number) {
        setCollapsedThresholds((prev) => ({ ...prev, [index]: !prev[index] }));
    }

    const { append, remove } = useFieldArray({
        control,
        name: 'thresholds'
    });

    const thresholds = useWatch({ control, name: 'thresholds' }) || [];

    function handleAddThreshold() {
        const newThreshold: WizardThresholdItem = {
            category: 'Honor',
            code: '',
            is_active: true,
            label: '',
            max_gwa: '',
            min_gwa: null,
            min_subject_grade: null,
            requires_no_failing: true,
            scholarship_discount_pct: null,
            sort_order: thresholds.length + 1
        };
        append(newThreshold);
    }

    return (
        <div className="flex flex-col gap-6">
            {!disabled && (
                <div className="flex justify-end items-center gap-2">
                    <CommonButton
                        className="min-w-0 [&_.MuiButton-startIcon]:mr-0 sm:[&_.MuiButton-startIcon]:mr-2 px-2.5 sm:px-3"
                        color="primary"
                        size="small"
                        startIcon={<PlusIcon className="w-3.5 h-3.5" />}
                        title="Add Threshold"
                        variant="contained"
                        onClick={handleAddThreshold}
                    >
                        <span className="hidden sm:inline">Add Threshold</span>
                    </CommonButton>
                </div>
            )}

            {/* Thresholds List / Cards */}
            <div className="flex flex-col gap-4">
                {thresholds.length === 0
                    ? (
                        <div className="text-center py-10 bg-slate-50/60 dark:bg-zinc-800/20 rounded-xl border border-dashed border-slate-200 dark:border-zinc-800 space-y-2">
                            <InfoIcon className="w-8 h-8 text-slate-400 mx-auto" />
                            <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
                                No academic thresholds defined.
                            </p>
                            {!disabled && (
                                <div className="pt-2 flex justify-center gap-2">
                                    <CommonButton
                                        color="primary"
                                        size="small"
                                        startIcon={<PlusIcon className="w-3.5 h-3.5" />}
                                        variant="contained"
                                        onClick={handleAddThreshold}
                                    >
                                        Add Threshold
                                    </CommonButton>
                                </div>
                            )}
                        </div>
                    )
                    : (
                        thresholds.map((item, idx) => {
                            return (
                                <div
                                    className="flex flex-col gap-4 p-4 sm:p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-sm transition-all hover:border-slate-300 dark:hover:border-zinc-700 w-full min-w-0"
                                    key={item.id || `threshold_${idx}`}
                                >
                                    {/* Row 1: Header with Action Buttons */}
                                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-700/50 pb-2.5">
                                        <div className="flex items-center gap-2 flex-1 min-w-0">
                                            <span className="w-6 h-6 rounded-md bg-slate-200 dark:bg-zinc-700 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center justify-center shrink-0">
                                                #{idx + 1}
                                            </span>
                                            <span className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">
                                                {item.label || `Threshold #${idx + 1}`}
                                            </span>
                                            {item.category && (
                                                <span className="px-2 py-0.5 text-[11px] font-medium rounded-full bg-slate-100 dark:bg-zinc-700 text-slate-600 dark:text-slate-300 shrink-0">
                                                    {item.category}
                                                </span>
                                            )}
                                            {item.max_gwa !== '' && item.max_gwa !== null && (
                                                <span className="text-xs text-slate-400 shrink-0 hidden sm:inline">
                                                    • Max GWA: {item.max_gwa}
                                                </span>
                                            )}
                                            <span
                                                className={`px-2 py-0.5 text-[11px] font-bold rounded-full shrink-0 ${item.is_active
                                                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                                                    : 'bg-slate-100 text-slate-600 dark:bg-zinc-800 dark:text-slate-400'}`}
                                            >
                                                {item.is_active
                                                    ? 'Active'
                                                    : 'Inactive'}
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-1.5 shrink-0">
                                            {!disabled && (
                                                <CommonButton
                                                    className="min-w-0 [&_.MuiButton-startIcon]:mr-0 sm:[&_.MuiButton-startIcon]:mr-2 px-2 sm:px-2.5"
                                                    color="error"
                                                    size="small"
                                                    startIcon={<TrashIcon className="w-3.5 h-3.5" />}
                                                    title="Delete threshold"
                                                    variant="outlined"
                                                    onClick={() => {
                                                        setDeleteThresholdTarget({
                                                            index: idx,
                                                            label: item.label || `Threshold #${idx + 1}`
                                                        });
                                                    }}
                                                >
                                                    <span className="hidden sm:inline">Delete</span>
                                                </CommonButton>
                                            )}
                                            <button
                                                aria-label={collapsedThresholds[idx]
                                                    ? 'Expand threshold'
                                                    : 'Collapse threshold'}
                                                className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 font-medium flex items-center gap-1 p-1.5 rounded-lg hover:bg-slate-200/60 dark:hover:bg-zinc-700/50 transition-colors cursor-pointer"
                                                title={collapsedThresholds[idx]
                                                    ? 'Expand threshold'
                                                    : 'Collapse threshold'}
                                                type="button"
                                                onClick={() => toggleThresholdCollapse(idx)}
                                            >
                                                <CaretDownIcon
                                                    className={`w-4 h-4 transition-transform duration-200 ${collapsedThresholds[idx]
                                                        ? '-rotate-90'
                                                        : 'rotate-0'}`}
                                                    weight="bold"
                                                />
                                                <span className="text-xs hidden sm:inline">{collapsedThresholds[idx]
                                                    ? 'Expand'
                                                    : 'Collapse'}</span>
                                            </button>
                                        </div>
                                    </div>

                                    <div
                                        className={collapsedThresholds[idx]
                                            ? 'hidden'
                                            : 'flex flex-col gap-4'}
                                    >

                                        {/* Row 2: Category, Threshold Name, and Status */}
                                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                                            {/* academic_thresholds.category NOT NULL (academic_threshold_category_type) */}
                                            <div className="sm:col-span-4 md:col-span-3">
                                                <ValidCommonSelect
                                                    control={control}
                                                    description="Functional classification of this academic criterion (Honor, Scholarship, or Academic Standing)."
                                                    disabled={disabled}
                                                    fullWidth
                                                    isRequired
                                                    label="Category"
                                                    name={`thresholds.${idx}.category`}
                                                    options={CATEGORY_OPTIONS}
                                                    rules={{
                                                        required: 'Category is required'
                                                    }}
                                                />
                                            </div>

                                            {/* academic_thresholds.label text NOT NULL (code is derived from it) */}
                                            <div className="sm:col-span-5 md:col-span-6">
                                                <ValidCommonInput
                                                    control={control}
                                                    description="Official title revealed on student rank lists, certificates, and academic summary cards."
                                                    disabled={disabled}
                                                    fullWidth
                                                    isRequired
                                                    label="Threshold Name / Label"
                                                    name={`thresholds.${idx}.label`}
                                                    placeholder="e.g. Summa Cum Laude, Full Scholar"
                                                    rules={{
                                                        required: 'Threshold name is required',
                                                        validate: (val) => Boolean(String(val || '')
                                                            .trim()) || 'Threshold name is required'
                                                    }}
                                                    onChange={(e) => {
                                                        clearFieldError(control, 'thresholds');
                                                        const otherCodes = thresholds
                                                            .map((th, i) => (i !== idx
                                                                ? th.code
                                                                : null))
                                                            .filter(Boolean) as string[];
                                                        const autoCode = generateAcademicThresholdCode(e.target.value, otherCodes);
                                                        setValue(`thresholds.${idx}.code`, autoCode, { shouldDirty: true });
                                                    }}
                                                />
                                            </div>

                                            <div className="sm:col-span-3 flex flex-col gap-(--mui-tokens-spacing-2) relative">
                                                <FormLabel
                                                    className="tw_body_small_bold"
                                                    description="Toggles whether this threshold is active for student evaluations."
                                                    label="Status"
                                                />
                                                <button
                                                    className={`w-full h-9 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                                                        item.is_active
                                                            ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                                                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-zinc-800 dark:text-slate-400 border border-slate-300 dark:border-zinc-700'
                                                    } ${disabled
                                                        ? 'cursor-default'
                                                        : 'cursor-pointer'}`}
                                                    disabled={disabled}
                                                    type="button"
                                                    onClick={() => setValue(`thresholds.${idx}.is_active`, !item.is_active, { shouldDirty: true })}
                                                >
                                                    {item.is_active
                                                        ? '✓ Active Threshold'
                                                        : '✕ Inactive'}
                                                </button>
                                            </div>
                                        </div>

                                        {/* Row 4: Min (numeric(4,2), nullable) and Max GWA (numeric(4,2) NOT NULL) */}
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            <div>
                                                <ValidCommonNumberInput
                                                    control={control}
                                                    description="Minimum (best) GWA required for this threshold tier (typically 1.00)."
                                                    disabled={disabled}
                                                    fullWidth
                                                    label="Min GWA"
                                                    max={NUMERIC_4_2_MAX}
                                                    maxDecimals={2}
                                                    min={0}
                                                    minDecimals={2}
                                                    name={`thresholds.${idx}.min_gwa`}
                                                    placeholder="1.00 (Optional)"
                                                    rules={{
                                                        max: { message: `Min GWA cannot exceed ${NUMERIC_4_2_MAX}`, value: NUMERIC_4_2_MAX },
                                                        min: { message: 'Min GWA cannot be negative', value: 0 },
                                                        validate: (val) => {
                                                            const maxGwa = item.max_gwa;
                                                            if (
                                                                val !== null && val !== undefined && val !== ''
                                                                && maxGwa !== null && maxGwa !== undefined && maxGwa !== ''
                                                                && Number(val) > Number(maxGwa)
                                                            ) {
                                                                return 'Min GWA cannot be greater than Max GWA';
                                                            }
                                                            return true;
                                                        }
                                                    }}
                                                    step={0.01}
                                                />
                                            </div>

                                            <div>
                                                <ValidCommonNumberInput
                                                    control={control}
                                                    description="Maximum allowed GWA cutoff. Students with GWA worse than this value are disqualified."
                                                    disabled={disabled}
                                                    fullWidth
                                                    isRequired
                                                    label="Max GWA (Cutoff)"
                                                    max={NUMERIC_4_2_MAX}
                                                    maxDecimals={2}
                                                    min={0}
                                                    minDecimals={2}
                                                    name={`thresholds.${idx}.max_gwa`}
                                                    placeholder="1.25"
                                                    rules={{
                                                        max: { message: `Max GWA cannot exceed ${NUMERIC_4_2_MAX}`, value: NUMERIC_4_2_MAX },
                                                        min: { message: 'Max GWA cannot be negative', value: 0 },
                                                        required: 'Max GWA cutoff is required'
                                                    }}
                                                    step={0.01}
                                                />
                                            </div>
                                        </div>

                                        {/* Row 5: Subject Floor Grade (numeric(4,2), nullable) and No Failing Checkbox */}
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
                                            <div>
                                                <ValidCommonNumberInput
                                                    control={control}
                                                    description="Worst allowed grade in any single course unit. If a student receives a grade worse than this, they are disqualified even if their GWA qualifies."
                                                    disabled={disabled}
                                                    fullWidth
                                                    label="Subject Floor Grade"
                                                    max={NUMERIC_4_2_MAX}
                                                    maxDecimals={2}
                                                    min={0}
                                                    minDecimals={2}
                                                    name={`thresholds.${idx}.min_subject_grade`}
                                                    placeholder="Optional (e.g. 2.50)"
                                                    rules={{
                                                        max: { message: `Subject floor grade cannot exceed ${NUMERIC_4_2_MAX}`, value: NUMERIC_4_2_MAX },
                                                        min: { message: 'Subject floor grade cannot be negative', value: 0 }
                                                    }}
                                                    step={0.01}
                                                />
                                            </div>

                                            <div className="flex items-center gap-1">
                                                <ValidCommonCheckbox
                                                    control={control}
                                                    disabled={disabled}
                                                    label="No failing grades permitted"
                                                    name={`thresholds.${idx}.requires_no_failing`}
                                                />
                                                <CommonInfoTooltip
                                                    content="Requires that the student has zero failing marks (5.00, DRP, INC) in the evaluation period."
                                                    size={13}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}

                {!disabled && thresholds.length > 0 && (
                    <div className="flex justify-start pt-1">
                        <CommonButton
                            color="primary"
                            size="small"
                            startIcon={<PlusIcon className="w-3.5 h-3.5" />}
                            variant="contained"
                            onClick={handleAddThreshold}
                        >
                            Add Threshold
                        </CommonButton>
                    </div>
                )}
            </div>

            {/* Delete Threshold Prompt Modal */}
            <DeletePromptModal
                formButtonsProps={{
                    cancelProps: {
                        onClick: () => setDeleteThresholdTarget(null)
                    },
                    confirmProps: {
                        onClick: () => {
                            if (deleteThresholdTarget !== null) {
                                remove(deleteThresholdTarget.index);
                                setDeleteThresholdTarget(null);
                            }
                        }
                    }
                }}
                isOpen={Boolean(deleteThresholdTarget)}
                mainContent={{
                    title: 'Delete Academic Threshold?'
                }}
                open={Boolean(deleteThresholdTarget)}
                subContent={{
                    title: `Are you sure you want to delete academic threshold "${deleteThresholdTarget?.label}"?`
                }}
                onClose={() => setDeleteThresholdTarget(null)}
            />
        </div>
    );
}