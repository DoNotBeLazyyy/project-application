import CommonButton from '@components/button/CommonButton';
import FormLabel from '@components/form/FormLabel';
import CommonInput from '@components/input/CommonInput';
import CommonNumberInput from '@components/input/CommonNumberInput';
import DeletePromptModal from '@components/modal/DeletePromptModal';
import CommonInfoTooltip from '@components/tooltip/CommonInfoTooltip';
import {
    CaretDownIcon,
    InfoIcon,
    PlusIcon,
    TrashIcon
} from '@phosphor-icons/react';
import { AcademicThresholdCategory } from '@type/academic-threshold.type';
import { AcademicYearWizardFormValues, WizardThresholdItem } from '@type/school-year.type';
import { generateAcademicThresholdCode } from '@utils/entity-code.util';
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
            {/* Top Toolbar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 sm:p-4 rounded-xl bg-white dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700/60 shadow-sm">
                <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Total Academic Thresholds: <span className="text-brand-600 dark:text-brand-400 font-bold">{thresholds.length}</span>
                </div>

                {!disabled && (
                    <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
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
            </div>

            {/* Thresholds List / Cards */}
            <div className="flex flex-col gap-4">
                {thresholds.length === 0 ? (
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
                ) : (
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
                                        : 'flex flex-col gap-4'}>

                                    {/* Row 2: Category and Threshold Name */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div>
                                            <FormLabel
                                                description="Functional classification of this academic criterion (Honor, Scholarship, or Academic Standing)."
                                                isRequired
                                                label="Category"
                                            />
                                            <select
                                                className="w-full h-9 px-3 text-xs font-semibold rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:border-none disabled:bg-transparent disabled:appearance-none disabled:p-0 disabled:font-medium cursor-pointer"
                                                disabled={disabled}
                                                value={item.category}
                                                onChange={(e) => {
                                                    const cat = e.target.value as AcademicThresholdCategory;
                                                    setValue(`thresholds.${idx}.category`, cat, { shouldDirty: true });
                                                }}
                                            >
                                                {CATEGORY_OPTIONS.map((c) => (
                                                    <option key={c.value} value={c.value}>
                                                        {c.label}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        <div>
                                            <CommonInput
                                                description="Official title revealed on student rank lists, certificates, and academic summary cards."
                                                disabled={disabled}
                                                error={Boolean((errors.thresholds as any)?.[idx]?.label)}
                                                fullWidth
                                                helperText={(errors.thresholds as any)?.[idx]?.label?.message}
                                                isRequired
                                                label="Threshold Name / Label"
                                                name={`thresholds.${idx}.label`}
                                                placeholder="e.g. Summa Cum Laude, Full Scholar"
                                                size="small"
                                                value={item.label}
                                                onChange={(e) => {
                                                    const newLabel = e.target.value;
                                                    setValue(`thresholds.${idx}.label`, newLabel, { shouldDirty: true, shouldValidate: true });
                                                    const otherCodes = thresholds
                                                        .map((th, i) => (i !== idx
                                                            ? th.code
                                                            : null))
                                                        .filter(Boolean) as string[];
                                                    const autoCode = generateAcademicThresholdCode(newLabel, otherCodes);
                                                    setValue(`thresholds.${idx}.code`, autoCode, { shouldDirty: true });
                                                }}
                                            />
                                        </div>
                                    </div>

                                    {/* Row 3: Unique Code and Status */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
                                        <div>
                                            <CommonInput
                                                description="System-generated unique academic threshold code."
                                                disabled={true}
                                                fullWidth
                                                label="Unique Code"
                                                placeholder="e.g. summa_cum_laude"
                                                size="small"
                                                value={item.code}
                                            />
                                        </div>

                                        <div>
                                            <FormLabel
                                                description="Toggles whether this threshold is active for student evaluations."
                                                label="Status"
                                            />
                                            <button
                                                className={`w-full h-9 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                                                    item.is_active
                                                        ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                                                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-zinc-800 dark:text-slate-400 border border-slate-300 dark:border-zinc-700'
                                                } disabled:opacity-60`}
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

                                    {/* Row 4: Min and Max GWA */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div>
                                            <CommonNumberInput
                                                description="Minimum (best) GWA required for this threshold tier (typically 1.00)."
                                                disabled={disabled}
                                                fullWidth
                                                label="Min GWA"
                                                maxDecimals={2}
                                                minDecimals={2}
                                                placeholder="1.00 (Optional)"
                                                size="small"
                                                step={0.01}
                                                value={item.min_gwa ?? ''}
                                                onChange={(val) =>
                                                    setValue(
                                                        `thresholds.${idx}.min_gwa`,
                                                        val === undefined
                                                            ? null
                                                            : val,
                                                        { shouldDirty: true }
                                                    )
                                                }
                                            />
                                        </div>

                                        <div>
                                            <CommonNumberInput
                                                description="Maximum allowed GWA cutoff. Students with GWA worse than this value are disqualified."
                                                disabled={disabled}
                                                error={Boolean((errors.thresholds as any)?.[idx]?.max_gwa)}
                                                fullWidth
                                                helperText={(errors.thresholds as any)?.[idx]?.max_gwa?.message}
                                                isRequired
                                                label="Max GWA (Cutoff)"
                                                maxDecimals={2}
                                                minDecimals={2}
                                                name={`thresholds.${idx}.max_gwa`}
                                                placeholder="1.25"
                                                size="small"
                                                step={0.01}
                                                value={item.max_gwa ?? ''}
                                                onChange={(val) => setValue(`thresholds.${idx}.max_gwa`, val === undefined
                                                    ? ''
                                                    : val, { shouldDirty: true, shouldValidate: true })}
                                            />
                                        </div>
                                    </div>

                                    {/* Row 5: Subject Floor Grade and No Failing Checkbox */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
                                        <div>
                                            <CommonNumberInput
                                                description="Worst allowed grade in any single course unit. If a student receives a grade worse than this, they are disqualified even if their GWA qualifies."
                                                disabled={disabled}
                                                fullWidth
                                                label="Subject Floor Grade"
                                                maxDecimals={2}
                                                minDecimals={2}
                                                placeholder="Optional (e.g. 2.50)"
                                                size="small"
                                                step={0.01}
                                                value={item.min_subject_grade ?? ''}
                                                onChange={(val) =>
                                                    setValue(
                                                        `thresholds.${idx}.min_subject_grade`,
                                                        val === undefined
                                                            ? null
                                                            : val,
                                                        { shouldDirty: true }
                                                    )
                                                }
                                            />
                                        </div>

                                        <div className="h-9 flex items-center px-3 rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800">
                                            <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-800 dark:text-slate-200 w-full select-none">
                                                <input
                                                    checked={Boolean(item.requires_no_failing)}
                                                    className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500 border-slate-300 dark:border-zinc-700 shrink-0"
                                                    disabled={disabled}
                                                    type="checkbox"
                                                    onChange={(e) => setValue(`thresholds.${idx}.requires_no_failing`, e.target.checked, { shouldDirty: true })}
                                                />
                                                <span className="truncate">No failing grades permitted</span>
                                                <CommonInfoTooltip content="Requires that the student has zero failing marks (5.00, DRP, INC) in the evaluation period." size={13} />
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })
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