import CommonButton from '@components/button/CommonButton';
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
                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                        <select
                            aria-label="Preset Thresholds"
                            className="h-8 px-2.5 text-xs font-semibold rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-500 cursor-pointer"
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

                        <CommonButton
                            color="inherit"
                            size="small"
                            startIcon={<ArrowCounterClockwiseIcon className="w-3.5 h-3.5" />}
                            variant="outlined"
                            onClick={handleResetBlank}
                        >
                            Reset to Blank
                        </CommonButton>
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
                                className="flex flex-col gap-4 p-4 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-sm transition-all hover:border-slate-300 dark:hover:border-zinc-700 w-full min-w-0"
                            >
                                {/* Mobile-First Responsive Grid Row 1: Category, Label, Code, Active, Actions */}
                                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end w-full min-w-0">
                                    {/* Category */}
                                    <div className="sm:col-span-3 min-w-0">
                                        <label className="flex items-center gap-1 text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                                            <span>Category <span className="text-red-500">*</span></span>
                                            <CommonInfoTooltip content="Functional classification of this academic criterion (Honor, Scholarship, or Academic Standing)." size={13} />
                                        </label>
                                        <select
                                            className="w-full h-9 px-2.5 rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:opacity-60"
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

                                    {/* Label */}
                                    <div className="sm:col-span-4 min-w-0">
                                        <label className="flex items-center gap-1 text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                                            <span>Threshold Name / Label <span className="text-red-500">*</span></span>
                                            <CommonInfoTooltip content="Official title revealed on student rank lists, certificates, and academic summary cards." size={13} />
                                        </label>
                                        <input
                                            className="w-full h-9 px-3 rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:opacity-60"
                                            disabled={disabled}
                                            placeholder="e.g. Summa Cum Laude, Full Scholar"
                                            type="text"
                                            value={item.label}
                                            onChange={(e) => update(idx, { ...item, label: e.target.value })}
                                        />
                                    </div>

                                    {/* Code */}
                                    <div className="sm:col-span-3 min-w-0">
                                        <label className="flex items-center gap-1 text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                                            <span>Unique Code</span>
                                            <CommonInfoTooltip content="System identifier code used for automated eligibility queries and SQL rules." size={13} />
                                        </label>
                                        <input
                                            className="w-full h-9 px-3 rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs font-mono text-slate-600 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:opacity-60"
                                            disabled={disabled}
                                            placeholder="e.g. summa_cum_laude"
                                            type="text"
                                            value={item.code}
                                            onChange={(e) => update(idx, { ...item, code: e.target.value })}
                                        />
                                    </div>

                                    {/* Active Toggle & Actions */}
                                    <div className="sm:col-span-2 flex items-center justify-between sm:justify-end gap-2 pt-2 sm:pt-0 shrink-0">
                                        <label className="inline-flex items-center gap-1.5 cursor-pointer text-xs font-semibold text-slate-700 dark:text-slate-300">
                                            <input
                                                checked={Boolean(item.is_active)}
                                                className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500 border-slate-300 dark:border-zinc-700"
                                                disabled={disabled}
                                                type="checkbox"
                                                onChange={(e) => update(idx, { ...item, is_active: e.target.checked })}
                                            />
                                            <span>Active</span>
                                        </label>

                                        {!disabled && (
                                            <div className="flex items-center gap-1">
                                                <button
                                                    className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
                                                    title="Reset threshold inputs to blank"
                                                    type="button"
                                                    onClick={() => handleResetThresholdBlank(idx)}
                                                >
                                                    <ArrowCounterClockwiseIcon className="w-4 h-4" />
                                                </button>
                                                <button
                                                    className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                                                    title="Delete Threshold"
                                                    type="button"
                                                    onClick={() => remove(idx)}
                                                >
                                                    <TrashIcon className="w-4 h-4" />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Criteria Details Row: GWA Range, Floor, Requires No Failing */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-3 border-t border-slate-100 dark:border-zinc-800/80 items-end w-full min-w-0">
                                    {/* Min GWA */}
                                    <div className="min-w-0">
                                        <label className="flex items-center gap-1 text-[11px] font-medium text-slate-500 mb-1">
                                            <span>Min GWA</span>
                                            <CommonInfoTooltip content="Minimum (best) GWA required for this threshold tier (typically 1.00)." size={13} />
                                        </label>
                                        <input
                                            className="w-full h-8 px-2.5 rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:opacity-60"
                                            disabled={disabled}
                                            placeholder="1.00 (Optional)"
                                            step="0.01"
                                            type="number"
                                            value={item.min_gwa ?? ''}
                                            onChange={(e) =>
                                                update(idx, {
                                                    ...item,
                                                    min_gwa: e.target.value === '' ? null : e.target.value
                                                })
                                            }
                                        />
                                    </div>

                                    {/* Max GWA (Cutoff) */}
                                    <div className="min-w-0">
                                        <label className="flex items-center gap-1 text-[11px] font-semibold text-brand-600 dark:text-brand-400 mb-1">
                                            <span>Max GWA (Cutoff) <span className="text-red-500">*</span></span>
                                            <CommonInfoTooltip content="Maximum allowed GWA cutoff. Students with GWA worse than this value are disqualified." size={13} />
                                        </label>
                                        <input
                                            className="w-full h-8 px-2.5 rounded-lg border border-brand-300 dark:border-brand-700/60 bg-white dark:bg-zinc-800 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:opacity-60"
                                            disabled={disabled}
                                            placeholder="1.25"
                                            step="0.01"
                                            type="number"
                                            value={item.max_gwa ?? ''}
                                            onChange={(e) => update(idx, { ...item, max_gwa: e.target.value })}
                                        />
                                    </div>

                                    {/* Subject Floor (Min individual subject grade) */}
                                    <div className="min-w-0">
                                        <label className="flex items-center gap-1 text-[11px] font-medium text-slate-500 mb-1">
                                            <span>Subject Floor Grade</span>
                                            <CommonInfoTooltip content="Worst allowed grade in any single course unit. If a student receives a grade worse than this, they are disqualified even if their GWA qualifies." size={13} />
                                        </label>
                                        <input
                                            className="w-full h-8 px-2.5 rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:opacity-60"
                                            disabled={disabled}
                                            placeholder="Optional (e.g. 2.50)"
                                            step="0.01"
                                            type="number"
                                            value={item.min_subject_grade ?? ''}
                                            onChange={(e) =>
                                                update(idx, {
                                                    ...item,
                                                    min_subject_grade: e.target.value === '' ? null : e.target.value
                                                })
                                            }
                                        />
                                    </div>

                                    {/* Requires No Failing Grade Checkbox */}
                                    <div className="min-w-0 pb-1">
                                        <label className="inline-flex items-center gap-1.5 cursor-pointer text-xs text-slate-700 dark:text-slate-300">
                                            <input
                                                checked={Boolean(item.requires_no_failing)}
                                                className="w-3.5 h-3.5 rounded text-brand-600 focus:ring-brand-500 border-slate-300 dark:border-zinc-700 shrink-0"
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
