import CommonButton from '@components/button/CommonButton';
import CommonInfoTooltip from '@components/tooltip/CommonInfoTooltip';
import {
    ArrowCounterClockwiseIcon,
    CheckCircleIcon,
    InfoIcon,
    PlusIcon,
    ScalesIcon,
    TrashIcon,
    WarningCircleIcon
} from '@phosphor-icons/react';
import { useToastStore } from '@stores/toast.store';
import { AcademicYearWizardFormValues, WizardGradingPeriodItem } from '@type/school-year.type';
import { Control, useWatch } from 'react-hook-form';
import {
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
            weight: 0
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
                start_date: distributed[idx]?.start_date || targetTerm.start_date || ''
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
            weight: p.weight
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
                                        <CommonButton
                                            color="primary"
                                            size="small"
                                            startIcon={<PlusIcon className="w-3.5 h-3.5" />}
                                            variant="outlined"
                                            onClick={() => handleAddPeriod(tIdx)}
                                        >
                                            Add Period
                                        </CommonButton>
                                    )}
                                </div>
                            </div>

                            {/* Preset Buttons & Copy Settings Option */}
                            {!disabled && (
                                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 pb-2 border-b border-slate-100 dark:border-zinc-700/30">
                                    <div className="flex flex-wrap items-center gap-2">
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
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-xs text-slate-500 font-medium hidden sm:inline">
                                                Copy:
                                            </span>
                                            <select
                                                aria-label="Copy grading periods from another term"
                                                className="text-xs px-2.5 py-1 rounded-md bg-brand-50 hover:bg-brand-100 dark:bg-brand-950/40 dark:hover:bg-brand-900/50 text-brand-700 dark:text-brand-300 font-medium border border-brand-200 dark:border-brand-800 focus:outline-none transition-colors cursor-pointer"
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
                            <div className="space-y-3">
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

                                    return (
                                        <div
                                            key={period.id || pIdx}
                                            className={`p-3.5 rounded-xl border flex flex-col md:flex-row md:items-center gap-3 transition-colors ${
                                                isDuplicateName || hasPrecedingConflict || hasDateOrderError || isOutsideTerm
                                                    ? 'border-amber-300 dark:border-amber-700/70 bg-amber-50/20 dark:bg-amber-950/10'
                                                    : 'border-slate-200 dark:border-zinc-700 bg-slate-50/60 dark:bg-zinc-800/40'
                                            }`}
                                        >
                                            {/* Sequence Badge */}
                                            <div className="flex items-center justify-between md:justify-start gap-2">
                                                <span className="w-6 h-6 rounded-md bg-slate-200 dark:bg-zinc-700 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center justify-center shrink-0">
                                                    #{period.sequence}
                                                </span>
                                                <span className="text-xs font-medium text-slate-500 md:hidden">
                                                    Period {period.sequence}
                                                </span>
                                                {!disabled && periods.length > 1 && (
                                                    <button
                                                        className="md:hidden text-xs text-red-500 hover:text-red-700 font-medium flex items-center gap-1 p-1"
                                                        type="button"
                                                        onClick={() => handleRemovePeriod(tIdx, pIdx)}
                                                    >
                                                        <TrashIcon className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>

                                            {/* Name input */}
                                            <div className="flex-1 min-w-[130px]">
                                                <label className="flex items-center gap-1 text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-0.5">
                                                    <span>Period Name <span className="text-red-500">*</span></span>
                                                    <CommonInfoTooltip content="Descriptive name of the grading period (e.g. Prelim, Midterm, Finals)." size={13} />
                                                </label>
                                                <input
                                                    className={`w-full px-3 py-1.5 text-sm rounded-lg border bg-white dark:bg-zinc-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 disabled:opacity-50 ${
                                                        isDuplicateName
                                                            ? 'border-red-500 focus:ring-red-500'
                                                            : 'border-slate-300 dark:border-zinc-700 focus:ring-brand-500'
                                                    }`}
                                                    disabled={disabled}
                                                    placeholder="e.g. Prelim, Midterm, Finals"
                                                    type="text"
                                                    value={period.name}
                                                    onChange={(e) => handleUpdatePeriod(tIdx, pIdx, { name: e.target.value })}
                                                />
                                                {isDuplicateName && (
                                                    <p className="text-[10px] text-red-500 font-semibold mt-0.5">
                                                        Duplicate name in this term
                                                    </p>
                                                )}
                                            </div>

                                            {/* Weight input */}
                                            <div className="w-full md:w-28">
                                                <label className="flex items-center gap-1 text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-0.5">
                                                    <span>Weight (%) <span className="text-red-500">*</span></span>
                                                    <CommonInfoTooltip content="Percentage contribution toward the final term grade. Sum of all periods in a term must equal 100%." size={13} />
                                                </label>
                                                <div className="relative">
                                                    <input
                                                        className="w-full px-3 py-1.5 pr-7 text-sm rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-50 font-semibold text-right"
                                                        disabled={disabled}
                                                        max={100}
                                                        min={0}
                                                        step={1}
                                                        type="number"
                                                        value={period.weight ?? ''}
                                                        onChange={(e) => handleUpdatePeriod(tIdx, pIdx, { weight: Number(e.target.value) || 0 })}
                                                    />
                                                    <span className="absolute right-2.5 top-1.5 text-xs text-slate-400 font-bold pointer-events-none">
                                                        %
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Start Date */}
                                            <div className="w-full md:w-36">
                                                <label className="flex items-center gap-1 text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-0.5">
                                                    <span>Start Date <span className="text-red-500">*</span></span>
                                                    <CommonInfoTooltip content="Opening date for coursework and assessment recording in this grading period." size={13} />
                                                </label>
                                                <input
                                                    required
                                                    className={`w-full px-2.5 py-1.5 text-xs rounded-lg border bg-white dark:bg-zinc-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 disabled:opacity-50 ${
                                                        hasPrecedingConflict
                                                            ? 'border-amber-500 focus:ring-amber-500'
                                                            : 'border-slate-300 dark:border-zinc-700 focus:ring-brand-500'
                                                    }`}
                                                    disabled={disabled}
                                                    type="date"
                                                    value={period.start_date || ''}
                                                    onChange={(e) => handleUpdatePeriodDate(tIdx, pIdx, 'start_date', e.target.value)}
                                                />
                                                {hasPrecedingConflict && (
                                                    <p className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold mt-0.5">
                                                        Overlaps with #{pIdx} end date
                                                    </p>
                                                )}
                                            </div>

                                            {/* End Date */}
                                            <div className="w-full md:w-36">
                                                <label className="flex items-center gap-1 text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-0.5">
                                                    <span>End Date <span className="text-red-500">*</span></span>
                                                    <CommonInfoTooltip content="Cut-off date for exams and grade input for this period." size={13} />
                                                </label>
                                                <input
                                                    required
                                                    className={`w-full px-2.5 py-1.5 text-xs rounded-lg border bg-white dark:bg-zinc-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 disabled:opacity-50 ${
                                                        hasDateOrderError
                                                            ? 'border-red-500 focus:ring-red-500'
                                                            : 'border-slate-300 dark:border-zinc-700 focus:ring-brand-500'
                                                    }`}
                                                    disabled={disabled}
                                                    type="date"
                                                    value={period.end_date || ''}
                                                    onChange={(e) => handleUpdatePeriodDate(tIdx, pIdx, 'end_date', e.target.value)}
                                                />
                                                {hasDateOrderError && (
                                                    <p className="text-[10px] text-red-500 font-semibold mt-0.5">
                                                        Must be after start date
                                                    </p>
                                                )}
                                            </div>

                                            {/* Row Actions (Reset to Blank & Remove) */}
                                            {!disabled && (
                                                <div className="flex items-center gap-1 pt-4">
                                                    <button
                                                        className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-700/50 transition-colors"
                                                        title="Reset period inputs to blank"
                                                        type="button"
                                                        onClick={() => handleUpdatePeriod(tIdx, pIdx, { name: '', weight: 0, start_date: '', end_date: '' })}
                                                    >
                                                        <ArrowCounterClockwiseIcon className="w-4 h-4" />
                                                    </button>
                                                    {periods.length > 1 && (
                                                        <button
                                                            className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                                                            title="Remove period"
                                                            type="button"
                                                            onClick={() => handleRemovePeriod(tIdx, pIdx)}
                                                        >
                                                            <TrashIcon className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
