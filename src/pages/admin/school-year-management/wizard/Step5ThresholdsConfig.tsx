import CommonButton from '@components/button/CommonButton';
import CommonInput from '@components/input/CommonInput';
import CommonNumberInput from '@components/input/CommonNumberInput';
import CommonInfoTooltip from '@components/tooltip/CommonInfoTooltip';
import {
    ArrowCounterClockwiseIcon,
    InfoIcon,
    PlusIcon,
    TrashIcon
} from '@phosphor-icons/react';
import { AcademicThresholdCategory } from '@type/academic-threshold.type';
import { AcademicYearWizardFormValues, WizardThresholdItem } from '@type/school-year.type';
import { Control, useFieldArray, useWatch } from 'react-hook-form';
import { DEFAULT_ACADEMIC_THRESHOLDS } from './wizard.constants';

interface Step5ThresholdsConfigProps {
    control: Control<AcademicYearWizardFormValues>;
    disabled?: boolean;
}

const CATEGORY_OPTIONS: { label: string; value: AcademicThresholdCategory }[] = [
    { label: 'Honor (Latin Honors)', value: 'Honor' },
    { label: 'Scholarship (Academic Qualification)', value: 'Scholarship' },
    { label: 'Academic Standing (Retention & Status)', value: 'Standing' }
];

export default function Step5ThresholdsConfig({
    control,
    disabled = false
}: Step5ThresholdsConfigProps) {
    const { append, remove, replace, update } = useFieldArray({
        control,
        name: 'thresholds'
    });

    const thresholds = useWatch({ control, name: 'thresholds' }) || [];

    function handleAddThreshold() {
        const newThreshold: WizardThresholdItem = {
            category: 'Honor',
            code: `custom_threshold_${Date.now()}`,
            is_active: true,
            label: 'New Academic Threshold',
            max_gwa: 1.75,
            min_gwa: 1.00,
            min_subject_grade: null,
            requires_no_failing: true,
            scholarship_discount_pct: null,
            sort_order: thresholds.length + 1
        };
        append(newThreshold);
    }

    function handleResetBlank() {
        replace([]);
    }

    function handleResetThresholdBlank(idx: number) {
        const item = thresholds[idx];
        if (!item) return;
        update(idx, {
            ...item,
            code: '',
            label: '',
            max_gwa: '',
            min_gwa: null,
            min_subject_grade: null,
            scholarship_discount_pct: null
        });
    }

    return (
        <div className="flex flex-col gap-6">
            {/* Top Toolbar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 sm:p-4 rounded-xl bg-white dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700/60 shadow-sm">
                <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Total Academic Thresholds: <span className="text-brand-600 dark:text-brand-400 font-bold">{thresholds.length}</span>
                </div>

                {!disabled && (
                    <div className="flex flex-wrap items-center gap-2 shrink-0 w-full sm:w-auto">
                        <select
                            aria-label="Preset Thresholds"
                            className="h-8 px-2.5 text-xs font-semibold rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-500 cursor-pointer w-full sm:w-auto"
                            value=""
                            onChange={(e) => {
                                if (e.target.value === 'honors') {
                                    replace([...DEFAULT_ACADEMIC_THRESHOLDS]);
                                }
                            }}
                        >
                            <option value="">-- Apply Preset Thresholds --</option>
                            <option value="honors">Standard Honors & Scholarships</option>
                        </select>

                        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                            <CommonButton
                                color="inherit"
                                size="small"
                                className="min-w-0 [&_.MuiButton-startIcon]:mr-0 sm:[&_.MuiButton-startIcon]:mr-2 px-2.5 sm:px-3"
                                startIcon={<ArrowCounterClockwiseIcon className="w-3.5 h-3.5" />}
                                variant="outlined"
                                onClick={handleResetBlank}
                                title="Reset to Blank"
                            >
                                <span className="hidden sm:inline">Reset to Blank</span>
                            </CommonButton>
                            <CommonButton
                                color="primary"
                                size="small"
                                className="min-w-0 [&_.MuiButton-startIcon]:mr-0 sm:[&_.MuiButton-startIcon]:mr-2 px-2.5 sm:px-3"
                                startIcon={<PlusIcon className="w-3.5 h-3.5" />}
                                variant="contained"
                                onClick={handleAddThreshold}
                                title="Add Threshold"
                            >
                                <span className="hidden sm:inline">Add Threshold</span>
                            </CommonButton>
                        </div>
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
                                    variant="contained"
                                    onClick={() => replace([...DEFAULT_ACADEMIC_THRESHOLDS])}
                                >
                                    Load Standard Honors Preset
                                </CommonButton>
                            </div>
                        )}
                    </div>
                ) : (
                    thresholds.map((item, idx) => {
                        return (
                            <div
                                key={item.id || idx}
                                className="flex flex-col gap-4 p-4 sm:p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-sm transition-all hover:border-slate-300 dark:hover:border-zinc-700 w-full min-w-0"
                            >
                                {/* Row 1: Header with Action Buttons */}
                                <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-700/50 pb-2.5">
                                    <div className="flex items-center gap-2">
                                        <span className="w-6 h-6 rounded-md bg-slate-200 dark:bg-zinc-700 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center justify-center shrink-0">
                                            #{idx + 1}
                                        </span>
                                        <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                                            Threshold #{idx + 1}
                                        </h4>
                                    </div>

                                    {!disabled && (
                                        <div className="flex items-center gap-1.5">
                                            <CommonButton
                                                color="inherit"
                                                size="small"
                                                className="min-w-0 [&_.MuiButton-startIcon]:mr-0 sm:[&_.MuiButton-startIcon]:mr-2 px-2 sm:px-2.5"
                                                startIcon={<ArrowCounterClockwiseIcon className="w-3.5 h-3.5" />}
                                                variant="outlined"
                                                onClick={() => handleResetThresholdBlank(idx)}
                                                title="Reset threshold fields to blank"
                                            >
                                                <span className="hidden sm:inline">Clear</span>
                                            </CommonButton>
                                            <CommonButton
                                                color="error"
                                                size="small"
                                                className="min-w-0 [&_.MuiButton-startIcon]:mr-0 sm:[&_.MuiButton-startIcon]:mr-2 px-2 sm:px-2.5"
                                                startIcon={<TrashIcon className="w-3.5 h-3.5" />}
                                                variant="outlined"
                                                onClick={() => remove(idx)}
                                                title="Delete threshold"
                                            >
                                                <span className="hidden sm:inline">Delete</span>
                                            </CommonButton>
                                        </div>
                                    )}
                                </div>

                                {/* Row 2: Category and Threshold Name */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <label className="flex items-center gap-1 text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                                            <span>Category <span className="text-red-500">*</span></span>
                                            <CommonInfoTooltip content="Functional classification of this academic criterion (Honor, Scholarship, or Academic Standing)." size={13} />
                                        </label>
                                        <select
                                            className="w-full h-9 px-3 text-xs font-semibold rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-60 cursor-pointer"
                                            disabled={disabled}
                                            value={item.category}
                                            onChange={(e) => {
                                                const cat = e.target.value as AcademicThresholdCategory;
                                                update(idx, {
                                                    ...item,
                                                    category: cat
                                                });
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
                                        <label className="flex items-center gap-1 text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                                            <span>Threshold Name / Label <span className="text-red-500">*</span></span>
                                            <CommonInfoTooltip content="Official title revealed on student rank lists, certificates, and academic summary cards." size={13} />
                                        </label>
                                        <CommonInput
                                            disabled={disabled}
                                            fullWidth
                                            placeholder="e.g. Summa Cum Laude, Full Scholar"
                                            size="small"
                                            value={item.label}
                                            onChange={(e) => update(idx, { ...item, label: e.target.value })}
                                        />
                                    </div>
                                </div>

                                {/* Row 3: Unique Code and Status */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
                                    <div>
                                        <label className="flex items-center gap-1 text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                                            <span>Unique Code</span>
                                            <CommonInfoTooltip content="System identifier code used for automated eligibility queries and SQL rules." size={13} />
                                        </label>
                                        <CommonInput
                                            disabled={disabled}
                                            fullWidth
                                            placeholder="e.g. summa_cum_laude"
                                            size="small"
                                            value={item.code}
                                            onChange={(e) => update(idx, { ...item, code: e.target.value })}
                                        />
                                    </div>

                                    <div>
                                        <label className="flex items-center gap-1 text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                                            <span>Status</span>
                                            <CommonInfoTooltip content="Toggles whether this threshold is active for student evaluations." size={13} />
                                        </label>
                                        <button
                                            className={`w-full h-9 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                                                item.is_active
                                                    ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-zinc-800 dark:text-slate-400 border border-slate-300 dark:border-zinc-700'
                                            } disabled:opacity-60`}
                                            disabled={disabled}
                                            type="button"
                                            onClick={() => update(idx, { ...item, is_active: !item.is_active })}
                                        >
                                            {item.is_active ? '✓ Active Threshold' : '✕ Inactive'}
                                        </button>
                                    </div>
                                </div>

                                {/* Row 4: Min and Max GWA */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <label className="flex items-center gap-1 text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                                            <span>Min GWA</span>
                                            <CommonInfoTooltip content="Minimum (best) GWA required for this threshold tier (typically 1.00)." size={13} />
                                        </label>
                                        <CommonNumberInput
                                            disabled={disabled}
                                            fullWidth
                                            maxDecimals={2}
                                            minDecimals={2}
                                            placeholder="1.00 (Optional)"
                                            size="small"
                                            step={0.01}
                                            value={item.min_gwa ?? ''}
                                            onChange={(val) =>
                                                update(idx, {
                                                    ...item,
                                                    min_gwa: val === undefined ? null : val
                                                })
                                            }
                                        />
                                    </div>

                                    <div>
                                        <label className="flex items-center gap-1 text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                                            <span>Max GWA (Cutoff) <span className="text-red-500">*</span></span>
                                            <CommonInfoTooltip content="Maximum allowed GWA cutoff. Students with GWA worse than this value are disqualified." size={13} />
                                        </label>
                                        <CommonNumberInput
                                            disabled={disabled}
                                            fullWidth
                                            maxDecimals={2}
                                            minDecimals={2}
                                            placeholder="1.25"
                                            size="small"
                                            step={0.01}
                                            value={item.max_gwa ?? ''}
                                            onChange={(val) => update(idx, { ...item, max_gwa: val === undefined ? '' : val })}
                                        />
                                    </div>
                                </div>

                                {/* Row 5: Subject Floor Grade and No Failing Checkbox */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
                                    <div>
                                        <label className="flex items-center gap-1 text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                                            <span>Subject Floor Grade</span>
                                            <CommonInfoTooltip content="Worst allowed grade in any single course unit. If a student receives a grade worse than this, they are disqualified even if their GWA qualifies." size={13} />
                                        </label>
                                        <CommonNumberInput
                                            disabled={disabled}
                                            fullWidth
                                            maxDecimals={2}
                                            minDecimals={2}
                                            placeholder="Optional (e.g. 2.50)"
                                            size="small"
                                            step={0.01}
                                            value={item.min_subject_grade ?? ''}
                                            onChange={(val) =>
                                                update(idx, {
                                                    ...item,
                                                    min_subject_grade: val === undefined ? null : val
                                                })
                                            }
                                        />
                                    </div>

                                    <div className="h-9 flex items-center px-3 rounded-lg border border-slate-200 dark:border-zinc-700 bg-slate-50/50 dark:bg-zinc-800/40">
                                        <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-800 dark:text-slate-200 w-full select-none">
                                            <input
                                                checked={Boolean(item.requires_no_failing)}
                                                className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500 border-slate-300 dark:border-zinc-700 shrink-0"
                                                disabled={disabled}
                                                type="checkbox"
                                                onChange={(e) => update(idx, { ...item, requires_no_failing: e.target.checked })}
                                            />
                                            <span className="truncate">No failing grades permitted</span>
                                            <CommonInfoTooltip content="Requires that the student has zero failing marks (5.00, DRP, INC) in the evaluation period." size={13} />
                                        </label>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
