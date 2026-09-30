import CommonButton from '@components/button/CommonButton';
import {
    ArrowCounterClockwiseIcon,
    CheckCircleIcon,
    GraduationCapIcon,
    InfoIcon,
    PlusIcon,
    TrashIcon
} from '@phosphor-icons/react';
import { AcademicThresholdCategory } from '@type/academic-threshold.type';
import { AcademicYearWizardFormValues, WizardThresholdItem } from '@type/school-year.type';
import { useState } from 'react';
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
    const [selectedCategory, setSelectedCategory] = useState<'All' | AcademicThresholdCategory>('All');

    const honorCount = thresholds.filter((t) => t.category === 'Honor').length;
    const scholarshipCount = thresholds.filter((t) => t.category === 'Scholarship').length;
    const standingCount = thresholds.filter((t) => t.category === 'Standing').length;

    const filteredIndices = thresholds
        .map((t, idx) => ({ ...t, originalIndex: idx }))
        .filter((t) => selectedCategory === 'All' || t.category === selectedCategory);

    function handleAddThreshold() {
        const defaultCategory: AcademicThresholdCategory = selectedCategory === 'All' ? 'Honor' : selectedCategory;
        const newThreshold: WizardThresholdItem = {
            category: defaultCategory,
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

    function handleResetDefault() {
        replace([...DEFAULT_ACADEMIC_THRESHOLDS]);
    }

    return (
        <div className="flex flex-col gap-6">
            {/* Header info */}
            <div className="flex items-start gap-3 p-4 rounded-xl bg-slate-50 dark:bg-zinc-800/40 border border-slate-200 dark:border-zinc-800 text-sm">
                <GraduationCapIcon className="w-5 h-5 text-brand-600 shrink-0 mt-0.5" />
                <div className="space-y-1 text-slate-700 dark:text-slate-300">
                    <p className="font-semibold text-slate-900 dark:text-slate-100">
                        Academic Thresholds & Qualification Flags
                    </p>
                    <p className="text-xs sm:text-sm">
                        Define academic performance cutoffs to track student advantages (Latin Honors, Academic Scholarships, Dean&apos;s List) and disadvantages (Academic Probation / Standing). These serve as official academic achievement and qualification flags for students and academic advisers.
                    </p>
                </div>
            </div>

            {/* Filter Pills & Summary */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-white dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700/60 shadow-sm">
                <div className="flex flex-wrap items-center gap-2">
                    <button
                        className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-all ${
                            selectedCategory === 'All'
                                ? 'bg-brand-600 text-white shadow-sm'
                                : 'bg-slate-100 dark:bg-zinc-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200'
                        }`}
                        type="button"
                        onClick={() => setSelectedCategory('All')}
                    >
                        All ({thresholds.length})
                    </button>
                    <button
                        className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-all ${
                            selectedCategory === 'Honor'
                                ? 'bg-brand-600 text-white shadow-sm'
                                : 'bg-slate-100 dark:bg-zinc-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200'
                        }`}
                        type="button"
                        onClick={() => setSelectedCategory('Honor')}
                    >
                        Honors ({honorCount})
                    </button>
                    <button
                        className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-all ${
                            selectedCategory === 'Scholarship'
                                ? 'bg-brand-600 text-white shadow-sm'
                                : 'bg-slate-100 dark:bg-zinc-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200'
                        }`}
                        type="button"
                        onClick={() => setSelectedCategory('Scholarship')}
                    >
                        Scholarships ({scholarshipCount})
                    </button>
                    <button
                        className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-all ${
                            selectedCategory === 'Standing'
                                ? 'bg-brand-600 text-white shadow-sm'
                                : 'bg-slate-100 dark:bg-zinc-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200'
                        }`}
                        type="button"
                        onClick={() => setSelectedCategory('Standing')}
                    >
                        Standing ({standingCount})
                    </button>
                </div>

                {!disabled && (
                    <div className="flex items-center gap-2 shrink-0">
                        <CommonButton
                            color="inherit"
                            size="small"
                            startIcon={<ArrowCounterClockwiseIcon className="w-3.5 h-3.5" />}
                            variant="outlined"
                            onClick={handleResetDefault}
                        >
                            Reset to Default
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
            <div className="flex flex-col gap-3">
                {filteredIndices.length === 0 ? (
                    <div className="text-center py-10 bg-slate-50/60 dark:bg-zinc-800/20 rounded-xl border border-dashed border-slate-200 dark:border-zinc-800">
                        <InfoIcon className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                        <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
                            No thresholds found for category "{selectedCategory}".
                        </p>
                        {!disabled && (
                            <button
                                className="mt-2 text-xs font-semibold text-brand-600 hover:underline"
                                type="button"
                                onClick={handleAddThreshold}
                            >
                                + Add a threshold
                            </button>
                        )}
                    </div>
                ) : (
                    filteredIndices.map((item) => {
                        const idx = item.originalIndex;

                        return (
                            <div
                                key={idx}
                                className="flex flex-col gap-4 p-4 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-sm transition-all hover:border-slate-300 dark:hover:border-zinc-700"
                            >
                                {/* Top Row: Label, Code, Category, Active, Delete */}
                                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                                    {/* Category */}
                                    <div className="sm:col-span-3">
                                        <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                                            Category <span className="text-red-500">*</span>
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
                                    <div className="sm:col-span-4">
                                        <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                                            Threshold Name / Label <span className="text-red-500">*</span>
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
                                    <div className="sm:col-span-3">
                                        <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                                            Unique Code
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

                                    {/* Active Toggle & Delete */}
                                    <div className="sm:col-span-2 flex items-center justify-end gap-3 pt-4 sm:pt-0">
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
                                            <button
                                                className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                                                title="Delete Threshold"
                                                type="button"
                                                onClick={() => remove(idx)}
                                            >
                                                <TrashIcon className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Criteria Details Row: GWA Range, Floor, Requires No Failing */}
                                <div className="grid grid-cols-2 sm:grid-cols-12 gap-3 pt-3 border-t border-slate-100 dark:border-zinc-800/80 items-end">
                                    {/* Min GWA */}
                                    <div className="sm:col-span-3">
                                        <label className="block text-[11px] font-medium text-slate-500 mb-1">
                                            Min GWA
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
                                    <div className="sm:col-span-3">
                                        <label className="block text-[11px] font-semibold text-brand-600 dark:text-brand-400 mb-1">
                                            Max GWA (Cutoff) <span className="text-red-500">*</span>
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
                                    <div className="sm:col-span-3">
                                        <label className="block text-[11px] font-medium text-slate-500 mb-1" title="Worst allowed single subject grade (optional)">
                                            Subject Floor Grade
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
                                    <div className="col-span-2 sm:col-span-3 pb-1">
                                        <label className="inline-flex items-center gap-1.5 cursor-pointer text-xs text-slate-700 dark:text-slate-300">
                                            <input
                                                checked={Boolean(item.requires_no_failing)}
                                                className="w-3.5 h-3.5 rounded text-brand-600 focus:ring-brand-500 border-slate-300 dark:border-zinc-700"
                                                disabled={disabled}
                                                type="checkbox"
                                                onChange={(e) => update(idx, { ...item, requires_no_failing: e.target.checked })}
                                            />
                                            <span className="truncate">No failing grades permitted</span>
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
