import { CommonDatePicker } from '@components/datepicker/ValidCommonDatepicker';
import CommonButton from '@components/button/CommonButton';
import CommonInput from '@components/input/CommonInput';
import CommonNumberInput from '@components/input/CommonNumberInput';
import DeletePromptModal from '@components/modal/DeletePromptModal';
import CommonInfoTooltip from '@components/tooltip/CommonInfoTooltip';
import {
    ArrowsCounterClockwiseIcon,
    BroomIcon,
    CheckCircleIcon,
    CopySimpleIcon,
    ListPlusIcon,
    PlusIcon,
    ScalesIcon,
    ShareNetworkIcon,
    TrashIcon,
    WarningCircleIcon
} from '@phosphor-icons/react';
import { useToastStore } from '@stores/toast.store';
import { AcademicYearWizardFormValues, WizardGradingPeriodComponentItem, WizardGradingPeriodItem } from '@type/school-year.type';
import { useState } from 'react';
import { Control, useWatch } from 'react-hook-form';
import CopyComponentBreakdownModal from './CopyComponentBreakdownModal';
import {
    DEFAULT_GRADING_COMPONENTS,
    DEFAULT_GRADING_PERIODS,
    distributeDatesAcrossPeriods,
    FOUR_PERIOD_PRESET,
    TWO_PERIOD_PRESET
} from './wizard.constants';

interface Step3GradingPeriodsConfigProps {
    control: Control<AcademicYearWizardFormValues>;
    disabled?: boolean;
    onChangeTerms: (terms: AcademicYearWizardFormValues['terms']) => void;
}

export default function Step3GradingPeriodsConfig({
    control,
    disabled = false,
    onChangeTerms
}: Step3GradingPeriodsConfigProps) {
    const terms = useWatch({ control, name: 'terms' }) || [];
    const [deletePeriodTarget, setDeletePeriodTarget] = useState<{ termIndex: number; periodIndex: number; name: string } | null>(null);
    const [deleteComponentTarget, setDeleteComponentTarget] = useState<{ termIndex: number; periodIndex: number; compIndex: number; name: string } | null>(null);
    const [copyModalState, setCopyModalState] = useState<{
        open: boolean;
        termIndex: number;
        periodIndex: number;
        termName: string;
        periodName: string;
    } | null>(null);

    function handleApplyCopiedComponents(
        components: WizardGradingPeriodComponentItem[],
        applyToAllInTerm: boolean,
        sourceLabel: string
    ) {
        if (!copyModalState) return;
        const { termIndex, periodIndex } = copyModalState;

        if (applyToAllInTerm) {
            handleApplyBreakdownToAllTermPeriods(termIndex, components);
        } else {
            handleUpdatePeriod(termIndex, periodIndex, { components });
            useToastStore.getState().showToast(
                `Component breakdown copied from "${sourceLabel}".`,
                'success'
            );
        }
    }

    function handleApplyBreakdownToAllTermPeriods(termIndex: number, components: WizardGradingPeriodComponentItem[]) {
        const targetTerm = terms[termIndex];
        if (!targetTerm || !targetTerm.grading_periods) return;

        const updatedPeriods = targetTerm.grading_periods.map((period) => ({
            ...period,
            components: components.map((c, i) => ({
                ...c,
                id: `comp_all_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 6)}`
            }))
        }));

        const updatedTerms = [...terms];
        updatedTerms[termIndex] = {
            ...targetTerm,
            grading_periods: updatedPeriods
        };

        onChangeTerms(updatedTerms);
        useToastStore.getState().showToast('Component breakdown applied to all grading periods in this term.', 'success');
    }

    // Clear all grading periods in a term down to 1 blank period
    function handleClearTermPeriods(termIndex: number) {
        const targetTerm = terms[termIndex];
        if (!targetTerm) return;

        const clearedPeriod: WizardGradingPeriodItem = {
            end_date: '',
            name: '',
            sequence: 1,
            start_date: '',
            weight: 0,
            major_exam_start_date: '',
            major_exam_end_date: '',
            grade_encoding_start_date: '',
            grade_encoding_end_date: '',
            components: []
        };

        const updatedTerms = [...terms];
        updatedTerms[termIndex] = {
            ...targetTerm,
            grading_periods: [clearedPeriod]
        };

        onChangeTerms(updatedTerms);
    }

    // Add a period to a specific term
    function handleAddPeriod(termIndex: number) {
        const targetTerm = terms[termIndex];
        if (!targetTerm) return;

        const currentPeriods = targetTerm.grading_periods || [];
        const nextSequence = currentPeriods.length + 1;
        let pStart = targetTerm.start_date || '';
        let pEnd = targetTerm.end_date || '';

        if (currentPeriods.length > 0) {
            const lastP = currentPeriods[currentPeriods.length - 1];
            if (lastP.end_date) {
                pStart = lastP.end_date;
                pEnd = targetTerm.end_date || lastP.end_date;
            }
        }

        const newPeriod: WizardGradingPeriodItem = {
            end_date: pEnd,
            name: `Period ${nextSequence}`,
            sequence: nextSequence,
            start_date: pStart,
            weight: 0,
            major_exam_start_date: '',
            major_exam_end_date: '',
            grade_encoding_start_date: '',
            grade_encoding_end_date: '',
            components: [...DEFAULT_GRADING_COMPONENTS]
        };

        const updatedTerms = [...terms];
        updatedTerms[termIndex] = {
            ...targetTerm,
            grading_periods: [...currentPeriods, newPeriod]
        };

        onChangeTerms(updatedTerms);
    }

    // Remove a period from a term
    function handleRemovePeriod(termIndex: number, periodIndex: number) {
        const targetTerm = terms[termIndex];
        if (!targetTerm) return;

        const currentPeriods = targetTerm.grading_periods || [];
        const updatedPeriods = currentPeriods.filter((_, idx) => idx !== periodIndex);

        // Re-sequence
        const resequenced = updatedPeriods.map((p, idx) => ({
            ...p,
            sequence: idx + 1
        }));

        const updatedTerms = [...terms];
        updatedTerms[termIndex] = {
            ...targetTerm,
            grading_periods: resequenced
        };

        onChangeTerms(updatedTerms);
    }

    // Update single period
    function handleUpdatePeriod(
        termIndex: number,
        periodIndex: number,
        partial: Partial<WizardGradingPeriodItem>
    ) {
        const targetTerm = terms[termIndex];
        if (!targetTerm) return;

        const currentPeriods = [...(targetTerm.grading_periods || [])];
        currentPeriods[periodIndex] = {
            ...currentPeriods[periodIndex],
            ...partial
        };

        const updatedTerms = [...terms];
        updatedTerms[termIndex] = {
            ...targetTerm,
            grading_periods: currentPeriods
        };

        onChangeTerms(updatedTerms);
    }

    // Update period date with auto-adjustment of succeeding periods
    function handleUpdatePeriodDate(
        termIndex: number,
        periodIndex: number,
        field: 'start_date' | 'end_date',
        value: string
    ) {
        const targetTerm = terms[termIndex];
        if (!targetTerm) return;

        const currentPeriods = [...(targetTerm.grading_periods || [])];
        const current = { ...currentPeriods[periodIndex], [field]: value };
        currentPeriods[periodIndex] = current;

        // If end_date is updated, ensure succeeding period start_date does not conflict
        if (field === 'end_date') {
            const nextPeriod = currentPeriods[periodIndex + 1];
            if (nextPeriod && nextPeriod.start_date && value && new Date(nextPeriod.start_date) < new Date(value)) {
                currentPeriods[periodIndex + 1] = {
                    ...nextPeriod,
                    end_date: nextPeriod.end_date && new Date(nextPeriod.end_date) <= new Date(value)
                        ? (targetTerm.end_date || value)
                        : nextPeriod.end_date,
                    start_date: value
                };
            }
        }

        const updatedTerms = [...terms];
        updatedTerms[termIndex] = {
            ...targetTerm,
            grading_periods: currentPeriods
        };

        onChangeTerms(updatedTerms);
    }

    // Apply preset with distributed dates
    function handleApplyPreset(termIndex: number, preset: WizardGradingPeriodItem[]) {
        const targetTerm = terms[termIndex];
        if (!targetTerm) return;

        const distributed = distributeDatesAcrossPeriods(
            targetTerm.start_date || '',
            targetTerm.end_date || '',
            preset.length
        );

        const updatedTerms = [...terms];
        updatedTerms[termIndex] = {
            ...targetTerm,
            grading_periods: preset.map((p, idx) => ({
                ...p,
                end_date: distributed[idx]?.end_date || targetTerm.end_date || '',
                start_date: distributed[idx]?.start_date || targetTerm.start_date || '',
                components: p.components ? [...p.components] : [...DEFAULT_GRADING_COMPONENTS]
            }))
        };

        onChangeTerms(updatedTerms);
    }

    // Copy grading period configuration from another term
    function handleCopyPeriodsFromTerm(targetTermIndex: number, sourceTermIndex: number) {
        const targetTerm = terms[targetTermIndex];
        const sourceTerm = terms[sourceTermIndex];
        if (!targetTerm || !sourceTerm) return;

        const sourcePeriods = sourceTerm.grading_periods || [];
        if (sourcePeriods.length === 0) {
            useToastStore.getState().showToast(
                `Selected source term has no grading periods to copy.`,
                'warning'
            );
            return;
        }

        const distributed = distributeDatesAcrossPeriods(
            targetTerm.start_date || '',
            targetTerm.end_date || '',
            sourcePeriods.length
        );

        const newPeriods: WizardGradingPeriodItem[] = sourcePeriods.map((p, idx) => ({
            end_date: distributed[idx]?.end_date || targetTerm.end_date || '',
            name: p.name,
            sequence: idx + 1,
            start_date: distributed[idx]?.start_date || targetTerm.start_date || '',
            weight: p.weight,
            major_exam_start_date: p.major_exam_start_date || '',
            major_exam_end_date: p.major_exam_end_date || '',
            grade_encoding_start_date: p.grade_encoding_start_date || '',
            grade_encoding_end_date: p.grade_encoding_end_date || '',
            components: p.components ? p.components.map((c) => ({ ...c })) : [...DEFAULT_GRADING_COMPONENTS]
        }));

        const updatedTerms = [...terms];
        updatedTerms[targetTermIndex] = {
            ...targetTerm,
            grading_periods: newPeriods
        };

        onChangeTerms(updatedTerms);
        useToastStore.getState().showToast(
            `Copied grading periods from ${sourceTerm.term_type_label || `Term #${sourceTermIndex + 1}`}.`,
            'info'
        );
    }

    // Add component item to period
    function handleAddComponent(termIndex: number, periodIndex: number) {
        const targetPeriod = terms[termIndex]?.grading_periods?.[periodIndex];
        if (!targetPeriod) return;

        const currentComponents = targetPeriod.components || [];
        const newComponent: WizardGradingPeriodComponentItem = {
            name: `Component ${currentComponents.length + 1}`,
            weight: 0
        };

        handleUpdatePeriod(termIndex, periodIndex, {
            components: [...currentComponents, newComponent]
        });
    }

    // Remove component item from period
    function handleRemoveComponent(termIndex: number, periodIndex: number, compIndex: number) {
        const targetPeriod = terms[termIndex]?.grading_periods?.[periodIndex];
        if (!targetPeriod) return;

        const currentComponents = targetPeriod.components || [];
        const updated = currentComponents.filter((_, idx) => idx !== compIndex);

        handleUpdatePeriod(termIndex, periodIndex, {
            components: updated
        });
    }

    // Update single component item in a period
    function handleUpdateComponentItem(
        termIndex: number,
        periodIndex: number,
        compIndex: number,
        partial: Partial<WizardGradingPeriodComponentItem>
    ) {
        const targetPeriod = terms[termIndex]?.grading_periods?.[periodIndex];
        if (!targetPeriod) return;

        const currentComponents = [...(targetPeriod.components || [])];
        currentComponents[compIndex] = {
            ...currentComponents[compIndex],
            ...partial
        };

        handleUpdatePeriod(termIndex, periodIndex, {
            components: currentComponents
        });
    }

    if (terms.length === 0) {
        return (
            <div className="p-8 text-center border-2 border-dashed border-slate-200 dark:border-zinc-800 rounded-2xl">
                <WarningCircleIcon className="w-10 h-10 text-amber-500 mx-auto mb-2" />
                <p className="font-semibold text-slate-800 dark:text-slate-200">
                    No Terms Defined
                </p>
                <p className="text-xs text-slate-500 mt-1">
                    Please go back to Step 2 and define at least one term first.
                </p>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6">
            {/* List of terms and their grading periods */}
            <div className="space-y-6">
                {terms.map((term, tIdx) => {
                    const periods = term.grading_periods || [];
                    const totalWeight = periods.reduce((sum, p) => sum + (Number(p.weight) || 0), 0);
                    const isBalanced = totalWeight === 100;
                    const termTitle = term.term_type_label || `Term #${tIdx + 1}`;

                    return (
                        <div
                            key={term.id || tIdx}
                            className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700/60 shadow-sm space-y-4"
                        >
                            {/* Term Heading & Weight Meter */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-zinc-700/40 pb-3">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="w-6 h-6 rounded-full bg-brand-100 dark:bg-brand-900/50 text-brand-700 dark:text-brand-300 text-xs font-bold flex items-center justify-center">
                                            {tIdx + 1}
                                        </span>
                                        <h4 className="font-semibold text-base text-slate-900 dark:text-slate-100">
                                            {termTitle}
                                        </h4>
                                    </div>
                                    <p className="text-xs text-slate-500 mt-0.5 ml-8">
                                        {term.start_date || 'No start'} to {term.end_date || 'No end'}
                                    </p>
                                </div>

                                <div className="flex flex-wrap items-center gap-2">
                                    {/* Weight Status Badge */}
                                    <span
                                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                                            isBalanced
                                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                                                : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                                        }`}
                                    >
                                        {isBalanced ? (
                                            <CheckCircleIcon className="w-4 h-4 text-emerald-600" />
                                        ) : (
                                            <WarningCircleIcon className="w-4 h-4 text-amber-600" />
                                        )}
                                        Weight: {totalWeight}% {isBalanced ? '(100%)' : '(Must equal 100%)'}
                                    </span>

                                    {!disabled && (
                                        <div className="flex items-center gap-2">
                                            <CommonButton
                                                color="inherit"
                                                size="small"
                                                startIcon={<BroomIcon className="w-3.5 h-3.5" />}
                                                variant="outlined"
                                                onClick={() => handleClearTermPeriods(tIdx)}
                                                title="Clear all grading periods for this term"
                                            >
                                                Clear Term
                                            </CommonButton>
                                            <CommonButton
                                                color="primary"
                                                size="small"
                                                startIcon={<PlusIcon className="w-3.5 h-3.5" />}
                                                variant="outlined"
                                                onClick={() => handleAddPeriod(tIdx)}
                                            >
                                                Add Period
                                            </CommonButton>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Preset Buttons & Copy Settings Option */}
                            {!disabled && (
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 pb-2 border-b border-slate-100 dark:border-zinc-700/30">
                                    {/* Mobile Presets Dropdown */}
                                    <div className="flex sm:hidden items-center gap-1.5 w-full">
                                        <ScalesIcon className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                                        <select
                                            aria-label="Select grading periods preset"
                                            className="text-xs px-2.5 py-1.5 rounded-md bg-slate-100 dark:bg-zinc-700 text-slate-700 dark:text-slate-200 font-medium border-0 focus:outline-none flex-1"
                                            value=""
                                            onChange={(e) => {
                                                if (e.target.value === '3') handleApplyPreset(tIdx, DEFAULT_GRADING_PERIODS);
                                                else if (e.target.value === '2') handleApplyPreset(tIdx, TWO_PERIOD_PRESET);
                                                else if (e.target.value === '4') handleApplyPreset(tIdx, FOUR_PERIOD_PRESET);
                                            }}
                                        >
                                            <option disabled value="">Select Preset...</option>
                                            <option value="3">3 Periods (30/30/40%)</option>
                                            <option value="2">2 Periods (50/50%)</option>
                                            <option value="4">4 Periods (25/25/25/25%)</option>
                                        </select>
                                    </div>

                                    {/* Desktop Presets Buttons */}
                                    <div className="hidden sm:flex flex-wrap items-center gap-2">
                                        <span className="text-xs text-slate-500 flex items-center gap-1 font-medium">
                                            <ScalesIcon className="w-3.5 h-3.5" />
                                            Presets:
                                        </span>
                                        <button
                                            className="text-xs px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 dark:bg-zinc-700 dark:hover:bg-zinc-600 text-slate-700 dark:text-slate-200 font-medium transition-colors"
                                            type="button"
                                            onClick={() => handleApplyPreset(tIdx, DEFAULT_GRADING_PERIODS)}
                                        >
                                            3 Periods (30/30/40%)
                                        </button>
                                        <button
                                            className="text-xs px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 dark:bg-zinc-700 dark:hover:bg-zinc-600 text-slate-700 dark:text-slate-200 font-medium transition-colors"
                                            type="button"
                                            onClick={() => handleApplyPreset(tIdx, TWO_PERIOD_PRESET)}
                                        >
                                            2 Periods (50/50%)
                                        </button>
                                        <button
                                            className="text-xs px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 dark:bg-zinc-700 dark:hover:bg-zinc-600 text-slate-700 dark:text-slate-200 font-medium transition-colors"
                                            type="button"
                                            onClick={() => handleApplyPreset(tIdx, FOUR_PERIOD_PRESET)}
                                        >
                                            4 Periods (25/25/25/25%)
                                        </button>
                                    </div>

                                    {/* Copy from another term dropdown */}
                                    {terms.length > 1 && (
                                        <div className="flex items-center gap-1.5 w-full sm:w-auto">
                                            <span className="text-xs text-slate-500 font-medium hidden sm:inline">
                                                Copy:
                                            </span>
                                            <select
                                                aria-label="Copy grading periods from another term"
                                                className="w-full sm:w-auto text-xs px-2.5 py-1.5 rounded-md bg-brand-50 hover:bg-brand-100 dark:bg-brand-950/40 dark:hover:bg-brand-900/50 text-brand-700 dark:text-brand-300 font-medium border border-brand-200 dark:border-brand-800 focus:outline-none transition-colors cursor-pointer"
                                                value=""
                                                onChange={(e) => {
                                                    if (e.target.value !== '') {
                                                        handleCopyPeriodsFromTerm(tIdx, Number(e.target.value));
                                                    }
                                                }}
                                            >
                                                <option disabled value="">
                                                    Copy settings from Term...
                                                </option>
                                                {terms.map((otherT, oIdx) => {
                                                    if (oIdx === tIdx) return null;
                                                    return (
                                                        <option key={otherT.id || oIdx} value={oIdx}>
                                                            {otherT.term_type_label || `Term #${oIdx + 1}`} ({otherT.grading_periods?.length || 0} periods)
                                                        </option>
                                                    );
                                                })}
                                            </select>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Periods List */}
                            <div className="space-y-4">
                                {periods.map((period, pIdx) => {
                                    const prevPeriod = pIdx > 0 ? periods[pIdx - 1] : null;

                                    // Duplicate name check
                                    const isDuplicateName = periods.some(
                                        (p, idx) => idx !== pIdx && p.name && p.name.trim().toLowerCase() === period.name.trim().toLowerCase()
                                    );

                                    // Preceding period conflict
                                    const hasPrecedingConflict = Boolean(
                                        prevPeriod &&
                                        period.start_date &&
                                        prevPeriod.end_date &&
                                        new Date(period.start_date) < new Date(prevPeriod.end_date)
                                    );

                                    // Date order error
                                    const hasDateOrderError = Boolean(
                                        period.start_date &&
                                        period.end_date &&
                                        new Date(period.end_date) <= new Date(period.start_date)
                                    );

                                    // Outside term bounds error
                                    const isOutsideTerm = Boolean(
                                        (term.start_date && period.start_date && new Date(period.start_date) < new Date(term.start_date)) ||
                                        (term.end_date && period.end_date && new Date(period.end_date) > new Date(term.end_date))
                                    );

                                    // Components weight total check
                                    const components = period.components || [];
                                    const compTotalWeight = components.reduce((sum, c) => sum + (Number(c.weight) || 0), 0);
                                    const isCompBalanced = components.length === 0 || compTotalWeight === 100;

                                    return (
                                        <div
                                            key={period.id || pIdx}
                                            className={`p-4 rounded-xl border flex flex-col gap-3 transition-colors ${
                                                isDuplicateName || hasPrecedingConflict || hasDateOrderError || isOutsideTerm || !isCompBalanced
                                                    ? 'border-amber-300 dark:border-amber-700/70 bg-amber-50/20 dark:bg-amber-950/10'
                                                    : 'border-slate-200 dark:border-zinc-700 bg-slate-50/60 dark:bg-zinc-800/40'
                                            }`}
                                        >
                                            {/* Row 1: Entry number and action buttons */}
                                            <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-zinc-700/50 pb-2.5">
                                                <div className="flex items-center gap-2">
                                                    <span className="w-6 h-6 rounded-md bg-slate-200 dark:bg-zinc-700 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center justify-center shrink-0">
                                                        #{period.sequence}
                                                    </span>
                                                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                                        Period #{period.sequence}
                                                    </span>
                                                </div>

                                                {!disabled && (
                                                    <div className="flex items-center gap-1.5">
                                                        <CommonButton
                                                            color="inherit"
                                                            size="small"
                                                            startIcon={<BroomIcon className="w-3.5 h-3.5" />}
                                                            variant="outlined"
                                                            onClick={() => handleUpdatePeriod(tIdx, pIdx, { name: '', weight: 0, start_date: '', end_date: '', major_exam_start_date: '', major_exam_end_date: '', grade_encoding_start_date: '', grade_encoding_end_date: '', components: [] })}
                                                            title="Clear period fields"
                                                        >
                                                            <span className="hidden sm:inline">Clear</span>
                                                        </CommonButton>
                                                        {periods.length > 1 && (
                                                            <CommonButton
                                                                color="error"
                                                                size="small"
                                                                startIcon={<TrashIcon className="w-3.5 h-3.5" />}
                                                                variant="outlined"
                                                                onClick={() => {
                                                                    setDeletePeriodTarget({
                                                                        termIndex: tIdx,
                                                                        periodIndex: pIdx,
                                                                        name: period.name || `Period #${period.sequence}`
                                                                    });
                                                                }}
                                                                title="Remove period"
                                                            >
                                                                <span className="hidden sm:inline">Remove</span>
                                                            </CommonButton>
                                                        )}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Row 2: Period name and weight */}
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                <div>
                                                    <label className="flex items-center gap-1 text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                                                        <span>Period Name <span className="text-red-500">*</span></span>
                                                        <CommonInfoTooltip content="Descriptive name of the grading period (e.g. Prelim, Midterm, Finals)." size={13} />
                                                    </label>
                                                    <CommonInput
                                                        disabled={disabled}
                                                        error={isDuplicateName}
                                                        fullWidth
                                                        placeholder="e.g. Prelim, Midterm, Finals"
                                                        size="small"
                                                        value={period.name}
                                                        onChange={(e) => handleUpdatePeriod(tIdx, pIdx, { name: e.target.value })}
                                                    />
                                                    {isDuplicateName && (
                                                        <p className="text-[10px] text-red-500 font-semibold mt-0.5">
                                                            Duplicate name in this term
                                                        </p>
                                                    )}
                                                </div>

                                                <div>
                                                    <label className="flex items-center gap-1 text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                                                        <span>Weight (%) <span className="text-red-500">*</span></span>
                                                        <CommonInfoTooltip content="Percentage contribution toward the final term grade. Sum of all periods in a term must equal 100%." size={13} />
                                                    </label>
                                                    <CommonNumberInput
                                                        disabled={disabled}
                                                        fullWidth
                                                        max={100}
                                                        min={0}
                                                        size="small"
                                                        suffixText="%"
                                                        value={period.weight ?? ''}
                                                        onChange={(val) => handleUpdatePeriod(tIdx, pIdx, { weight: val ?? 0 })}
                                                    />
                                                </div>
                                            </div>

                                            {/* Row 3: Start and End Date */}
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                <div>
                                                    <label className="flex items-center gap-1 text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                                                        <span>Period Start Date <span className="text-red-500">*</span></span>
                                                        <CommonInfoTooltip content="Opening date for coursework and assessment recording in this grading period." size={13} />
                                                    </label>
                                                    <CommonDatePicker
                                                        disabled={disabled}
                                                        error={hasPrecedingConflict}
                                                        value={period.start_date || ''}
                                                        onChange={(val) => handleUpdatePeriodDate(tIdx, pIdx, 'start_date', val)}
                                                    />
                                                    {hasPrecedingConflict && (
                                                        <p className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold mt-0.5">
                                                            Overlaps with #{pIdx} end date
                                                        </p>
                                                    )}
                                                </div>

                                                <div>
                                                    <label className="flex items-center gap-1 text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                                                        <span>Period End Date <span className="text-red-500">*</span></span>
                                                        <CommonInfoTooltip content="Cut-off date for exams and grade input for this period." size={13} />
                                                    </label>
                                                    <CommonDatePicker
                                                        disabled={disabled}
                                                        error={hasDateOrderError}
                                                        value={period.end_date || ''}
                                                        onChange={(val) => handleUpdatePeriodDate(tIdx, pIdx, 'end_date', val)}
                                                    />
                                                    {hasDateOrderError && (
                                                        <p className="text-[10px] text-red-500 font-semibold mt-0.5">
                                                            Must be after start date
                                                        </p>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Row 4: Major Examination Day(s) & Grade Encoding Range */}
                                            <div className="pt-2 border-t border-slate-200/50 dark:border-zinc-700/40 grid grid-cols-1 md:grid-cols-2 gap-4">
                                                {/* Major Examination Days */}
                                                <div className="space-y-1.5 bg-slate-100/70 dark:bg-zinc-800/60 p-2.5 rounded-lg border border-slate-200/80 dark:border-zinc-700/50">
                                                    <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                                                        <span>Major Examination Day(s)</span>
                                                        <CommonInfoTooltip content="Date or date range reserved for major examinations (e.g. Midterm Exams, Final Exams)." size={12} />
                                                    </div>
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                        <div>
                                                            <span className="block text-[10px] text-slate-500 mb-0.5">Exam Start</span>
                                                            <CommonDatePicker
                                                                disabled={disabled}
                                                                value={period.major_exam_start_date || ''}
                                                                onChange={(val) => handleUpdatePeriod(tIdx, pIdx, { major_exam_start_date: val })}
                                                            />
                                                        </div>
                                                        <div>
                                                            <span className="block text-[10px] text-slate-500 mb-0.5">Exam End</span>
                                                            <CommonDatePicker
                                                                disabled={disabled}
                                                                value={period.major_exam_end_date || ''}
                                                                onChange={(val) => handleUpdatePeriod(tIdx, pIdx, { major_exam_end_date: val })}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Grade Encoding Range */}
                                                <div className="space-y-1.5 bg-slate-100/70 dark:bg-zinc-800/60 p-2.5 rounded-lg border border-slate-200/80 dark:border-zinc-700/50">
                                                    <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                                                        <span>Grade Encoding Range</span>
                                                        <CommonInfoTooltip content="Official window during which faculty members can encode and submit grades for this period." size={12} />
                                                    </div>
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                        <div>
                                                            <span className="block text-[10px] text-slate-500 mb-0.5">Encoding Start</span>
                                                            <CommonDatePicker
                                                                disabled={disabled}
                                                                value={period.grade_encoding_start_date || ''}
                                                                onChange={(val) => handleUpdatePeriod(tIdx, pIdx, { grade_encoding_start_date: val })}
                                                            />
                                                        </div>
                                                        <div>
                                                            <span className="block text-[10px] text-slate-500 mb-0.5">Encoding End</span>
                                                            <CommonDatePicker
                                                                disabled={disabled}
                                                                value={period.grade_encoding_end_date || ''}
                                                                onChange={(val) => handleUpdatePeriod(tIdx, pIdx, { grade_encoding_end_date: val })}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Row 5: Grading Component Breakdown */}
                                            <div className="pt-3 border-t border-slate-200/60 dark:border-zinc-700/50 space-y-2.5">
                                                <div className="flex flex-col gap-2">
                                                    <div className="flex items-center justify-between gap-2 w-full">
                                                        <div className="flex items-center gap-1 min-w-0">
                                                            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1 truncate">
                                                                <ListPlusIcon className="w-4 h-4 text-brand-600 dark:text-brand-400 shrink-0" />
                                                                Grading Component Breakdown
                                                            </span>
                                                            <CommonInfoTooltip
                                                                content="Component weight breakdown for this grading period (e.g., Quizzes: 30%, Performance Tasks: 30%, Major Exam: 40%). Total component weight must equal 100%."
                                                                size={13}
                                                                className="shrink-0"
                                                            />
                                                        </div>

                                                        {/* Simple 100/100 badge - positioned on right side in mobile and desktop */}
                                                        <span
                                                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold shrink-0 ml-auto ${
                                                                isCompBalanced
                                                                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                                                                    : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                                                            }`}
                                                        >
                                                            {isCompBalanced ? (
                                                                <CheckCircleIcon className="w-3.5 h-3.5 text-emerald-600" />
                                                            ) : (
                                                                <WarningCircleIcon className="w-3.5 h-3.5 text-amber-600" />
                                                            )}
                                                            <span>{compTotalWeight}/100</span>
                                                        </span>
                                                    </div>

                                                    {!disabled && (
                                                            <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap justify-end">
                                                                <button
                                                                    type="button"
                                                                    className="text-[11px] p-1.5 sm:px-2 sm:py-0.5 rounded bg-slate-100 hover:bg-slate-200 dark:bg-zinc-700 dark:hover:bg-zinc-600 text-slate-700 dark:text-slate-200 font-medium transition-colors flex items-center gap-1 cursor-pointer"
                                                                    onClick={() => setCopyModalState({
                                                                        open: true,
                                                                        termIndex: tIdx,
                                                                        periodIndex: pIdx,
                                                                        termName: term.term_type_label || `Term #${tIdx + 1}`,
                                                                        periodName: period.name || `Period #${pIdx + 1}`
                                                                    })}
                                                                    title="Copy component breakdown from another period or standard template"
                                                                    aria-label="Copy component breakdown from another period or standard template"
                                                                >
                                                                    <CopySimpleIcon className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400" />
                                                                    <span className="hidden sm:inline">Copy Breakdown...</span>
                                                                    <span className="sm:hidden">Copy</span>
                                                                </button>

                                                                {components.length > 0 && (
                                                                    <button
                                                                        type="button"
                                                                        className="text-[11px] p-1.5 sm:px-2 sm:py-0.5 rounded bg-sky-50 hover:bg-sky-100 dark:bg-sky-950/40 dark:hover:bg-sky-900/50 text-sky-700 dark:text-sky-300 font-medium transition-colors flex items-center gap-1 cursor-pointer"
                                                                        onClick={() => handleApplyBreakdownToAllTermPeriods(tIdx, components)}
                                                                        title="Apply this breakdown to all grading periods in this term"
                                                                        aria-label="Apply this breakdown to all grading periods in this term"
                                                                    >
                                                                        <ShareNetworkIcon className="w-3.5 h-3.5" />
                                                                        <span className="hidden sm:inline">Apply to All</span>
                                                                    </button>
                                                                )}

                                                                <button
                                                                    type="button"
                                                                    className="text-[11px] p-1.5 sm:px-2 sm:py-0.5 rounded bg-slate-100 hover:bg-slate-200 dark:bg-zinc-700 dark:hover:bg-zinc-600 text-slate-700 dark:text-slate-200 font-medium transition-colors flex items-center gap-1 cursor-pointer"
                                                                    onClick={() => handleUpdatePeriod(tIdx, pIdx, { components: [...DEFAULT_GRADING_COMPONENTS] })}
                                                                    title="Reset to standard 30/30/40 breakdown"
                                                                    aria-label="Reset to standard 30/30/40 breakdown"
                                                                >
                                                                    <ArrowsCounterClockwiseIcon className="w-3.5 h-3.5 sm:hidden" />
                                                                    <span className="hidden sm:inline">Reset Preset</span>
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    className="text-[11px] p-1.5 sm:px-2 sm:py-0.5 rounded bg-brand-50 hover:bg-brand-100 dark:bg-brand-950/40 dark:hover:bg-brand-900/50 text-brand-700 dark:text-brand-300 font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                                                                    onClick={() => handleAddComponent(tIdx, pIdx)}
                                                                    title="Add Component"
                                                                    aria-label="Add Component"
                                                                >
                                                                    <PlusIcon className="w-3.5 h-3.5" />
                                                                    <span className="hidden sm:inline">Add Component</span>
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>

                                                {/* Component Items List */}
                                                {components.length === 0 ? (
                                                    <div className="p-3 text-center rounded-lg border border-dashed border-slate-200 dark:border-zinc-700/60 bg-white/50 dark:bg-zinc-800/30">
                                                        <p className="text-xs text-slate-500">No component breakdown declared yet.</p>
                                                        {!disabled && (
                                                            <button
                                                                type="button"
                                                                className="text-xs text-brand-600 dark:text-brand-400 font-semibold underline mt-1"
                                                                onClick={() => handleUpdatePeriod(tIdx, pIdx, { components: [...DEFAULT_GRADING_COMPONENTS] })}
                                                            >
                                                                Apply standard 30/30/40 breakdown (Quizzes, Class Standing, Major Exam)
                                                            </button>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <div className="space-y-2">
                                                        {components.map((comp, cIdx) => (
                                                            <div
                                                                key={comp.id || cIdx}
                                                                className="flex items-center gap-2 bg-white dark:bg-zinc-800 p-2 rounded-lg border border-slate-200 dark:border-zinc-700"
                                                            >
                                                                <span className="w-5 h-5 rounded bg-slate-100 dark:bg-zinc-700 text-slate-600 dark:text-slate-300 text-[10px] font-bold flex items-center justify-center shrink-0">
                                                                    c{cIdx + 1}
                                                                </span>

                                                                 <CommonInput
                                                                    containerClassName="flex-1"
                                                                    disabled={disabled}
                                                                    placeholder="e.g. Quizzes, Projects, Major Exam"
                                                                    size="small"
                                                                    value={comp.name}
                                                                    onChange={(e) => handleUpdateComponentItem(tIdx, pIdx, cIdx, { name: e.target.value })}
                                                                />

                                                                <div className="w-28 shrink-0">
                                                                    <CommonNumberInput
                                                                        disabled={disabled}
                                                                        max={100}
                                                                        min={0}
                                                                        size="small"
                                                                        suffixText="%"
                                                                        value={comp.weight ?? ''}
                                                                        onChange={(val) => handleUpdateComponentItem(tIdx, pIdx, cIdx, { weight: val ?? 0 })}
                                                                    />
                                                                </div>

                                                                {!disabled && (
                                                                    <button
                                                                        type="button"
                                                                        className="p-1 text-slate-400 hover:text-red-500 transition-colors cursor-pointer"
                                                                        onClick={() => {
                                                                            setDeleteComponentTarget({
                                                                                termIndex: tIdx,
                                                                                periodIndex: pIdx,
                                                                                compIndex: cIdx,
                                                                                name: comp.name || `Component #${cIdx + 1}`
                                                                            });
                                                                        }}
                                                                        title="Remove component"
                                                                    >
                                                                        <TrashIcon className="w-3.5 h-3.5" />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>

            {copyModalState?.open && (
                <CopyComponentBreakdownModal
                    open={copyModalState.open}
                    targetPeriodIndex={copyModalState.periodIndex}
                    targetPeriodName={copyModalState.periodName}
                    targetTermIndex={copyModalState.termIndex}
                    targetTermName={copyModalState.termName}
                    terms={terms}
                    onApply={handleApplyCopiedComponents}
                    onClose={() => setCopyModalState(null)}
                />
            )}

            {/* Delete Period Prompt Modal */}
            <DeletePromptModal
                isOpen={Boolean(deletePeriodTarget)}
                mainContent={{
                    title: 'Delete Grading Period?'
                }}
                subContent={{
                    title: `Are you sure you want to delete "${deletePeriodTarget?.name}"? All component weights configured inside will be removed.`
                }}
                open={Boolean(deletePeriodTarget)}
                onClose={() => setDeletePeriodTarget(null)}
                formButtonsProps={{
                    confirmProps: {
                        onClick: () => {
                            if (deletePeriodTarget !== null) {
                                handleRemovePeriod(deletePeriodTarget.termIndex, deletePeriodTarget.periodIndex);
                                setDeletePeriodTarget(null);
                            }
                        }
                    }
                }}
            />

            {/* Delete Component Prompt Modal */}
            <DeletePromptModal
                isOpen={Boolean(deleteComponentTarget)}
                mainContent={{
                    title: 'Delete Component Item?'
                }}
                subContent={{
                    title: `Are you sure you want to delete component "${deleteComponentTarget?.name}"?`
                }}
                open={Boolean(deleteComponentTarget)}
                onClose={() => setDeleteComponentTarget(null)}
                formButtonsProps={{
                    confirmProps: {
                        onClick: () => {
                            if (deleteComponentTarget !== null) {
                                handleRemoveComponent(
                                    deleteComponentTarget.termIndex,
                                    deleteComponentTarget.periodIndex,
                                    deleteComponentTarget.compIndex
                                );
                                setDeleteComponentTarget(null);
                            }
                        }
                    }
                }}
            />
        </div>
    );
}
