import { CommonDatePicker } from '@components/datepicker/ValidCommonDatepicker';
import CommonButton from '@components/button/CommonButton';
import CommonInput from '@components/input/CommonInput';
import CommonNumberInput from '@components/input/CommonNumberInput';
import DeletePromptModal from '@components/modal/DeletePromptModal';
import CommonInfoTooltip from '@components/tooltip/CommonInfoTooltip';
import {
    CaretDownIcon,
    CheckCircleIcon,
    ListPlusIcon,
    PlusIcon,
    ScalesIcon,
    TrashIcon,
    WarningCircleIcon
} from '@phosphor-icons/react';
import { useToastStore } from '@stores/toast.store';
import { AcademicYearWizardFormValues, WizardGradingPeriodComponentItem, WizardGradingPeriodItem } from '@type/school-year.type';
import { useEffect, useState } from 'react';
import { Control, useFormState, UseFormSetValue, useWatch } from 'react-hook-form';

interface Step3GradingPeriodsConfigProps {
    control: Control<AcademicYearWizardFormValues>;
    disabled?: boolean;
    setValue?: UseFormSetValue<AcademicYearWizardFormValues>;
    onChangeTerms: (terms: AcademicYearWizardFormValues['terms']) => void;
}

export default function Step3GradingPeriodsConfig({
    control,
    disabled = false,
    setValue,
    onChangeTerms
}: Step3GradingPeriodsConfigProps) {
    const terms = useWatch({ control, name: 'terms' }) || [];
    const [deletePeriodTarget, setDeletePeriodTarget] = useState<{ termIndex: number; periodIndex: number; name: string } | null>(null);
    const [focusTarget, setFocusTarget] = useState<{ type: 'period' | 'component'; key: string } | null>(null);
    const [collapsedPeriods, setCollapsedPeriods] = useState<Record<string, boolean>>({});
    const [collapsedTerms, setCollapsedTerms] = useState<Record<number, boolean>>({});

    const { errors } = useFormState({ control });

    useEffect(() => {
        if (errors.terms && Array.isArray(errors.terms)) {
            errors.terms.forEach((tErr: any, tIdx: number) => {
                if (tErr?.grading_periods && Array.isArray(tErr.grading_periods)) {
                    tErr.grading_periods.forEach((pErr: any, pIdx: number) => {
                        if (pErr) {
                            setCollapsedTerms((prev) => ({ ...prev, [tIdx]: false }));
                            setCollapsedPeriods((prev) => ({ ...prev, [`${tIdx}_${pIdx}`]: false }));
                        }
                    });
                }
            });
        }
    }, [errors]);

    function toggleTermCollapse(index: number) {
        setCollapsedTerms((prev) => ({ ...prev, [index]: !prev[index] }));
    }

    function togglePeriodCollapse(key: string) {
        setCollapsedPeriods((prev) => ({ ...prev, [key]: !prev[key] }));
    }

    // Add a period to a specific term
    function handleAddPeriod(termIndex: number) {
        const targetTerm = terms[termIndex];
        if (!targetTerm) return;

        if (collapsedTerms[termIndex]) {
            setCollapsedTerms((prev) => ({ ...prev, [termIndex]: false }));
        }

        const currentPeriods = targetTerm.grading_periods || [];
        const nextSequence = currentPeriods.length + 1;
        const newPeriod: WizardGradingPeriodItem = {
            end_date: '',
            name: '',
            sequence: nextSequence,
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
            grading_periods: [...currentPeriods, newPeriod]
        };

        onChangeTerms(updatedTerms);
        setFocusTarget({ type: 'period', key: `term_${termIndex}_period_${currentPeriods.length}` });
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
        if (setValue) {
            Object.entries(partial).forEach(([field, val]) => {
                setValue(`terms.${termIndex}.grading_periods.${periodIndex}.${field}` as any, val, {
                    shouldDirty: true,
                    shouldValidate: true
                });
            });
            return;
        }

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

    // Add component item to period
    function handleAddComponent(termIndex: number, periodIndex: number) {
        const targetPeriod = terms[termIndex]?.grading_periods?.[periodIndex];
        if (!targetPeriod) return;

        const currentComponents = targetPeriod.components || [];
        const newComponent: WizardGradingPeriodComponentItem = {
            name: '',
            weight: 0
        };

        handleUpdatePeriod(termIndex, periodIndex, {
            components: [...currentComponents, newComponent]
        });
        setFocusTarget({ type: 'component', key: `comp_${termIndex}_${periodIndex}_${currentComponents.length}` });
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
        if (setValue) {
            Object.entries(partial).forEach(([field, val]) => {
                setValue(`terms.${termIndex}.grading_periods.${periodIndex}.components.${compIndex}.${field}` as any, val, {
                    shouldDirty: true,
                    shouldValidate: true
                });
            });
            return;
        }

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
                            className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700/60 shadow-sm space-y-4"
                            key={term.id || tIdx}
                        >
                            {/* Term Heading & Weight Meter */}
                            <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${collapsedTerms[tIdx] ? '' : 'border-b border-slate-100 dark:border-zinc-700/40 pb-3'}`}>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="w-6 h-6 rounded-full bg-brand-100 dark:bg-brand-900/50 text-brand-700 dark:text-brand-300 text-xs font-bold flex items-center justify-center">
                                            {tIdx + 1}
                                        </span>
                                        <h4 className="font-semibold text-base text-slate-900 dark:text-slate-100">
                                            {termTitle}
                                        </h4>
                                        <span className="text-xs text-slate-500 font-normal">
                                            ({periods.length} {periods.length === 1 ? 'period' : 'periods'})
                                        </span>
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
                                        {isBalanced
                                            ? (
                                                <CheckCircleIcon className="w-4 h-4 text-emerald-600" />
                                            )
                                            : (
                                                <WarningCircleIcon className="w-4 h-4 text-amber-600" />
                                            )}
                                        Weight: {totalWeight}% {isBalanced
                                            ? '(100%)'
                                            : '(Must equal 100%)'}
                                    </span>

                                    {!disabled && (
                                        <div className="flex items-center gap-2">
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

                                    <button
                                        className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 font-medium flex items-center gap-1 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-700/50 transition-colors cursor-pointer"
                                        title={collapsedTerms[tIdx] ? 'Expand Term' : 'Collapse Term'}
                                        type="button"
                                        aria-label={collapsedTerms[tIdx] ? 'Expand Term' : 'Collapse Term'}
                                        onClick={() => toggleTermCollapse(tIdx)}
                                    >
                                        <CaretDownIcon
                                            className={`w-4 h-4 transition-transform duration-200 ${collapsedTerms[tIdx] ? '-rotate-90' : 'rotate-0'}`}
                                            weight="bold"
                                        />
                                        <span className="text-xs hidden sm:inline">{collapsedTerms[tIdx] ? 'Expand' : 'Collapse'}</span>
                                    </button>
                                </div>
                            </div>

                            {/* Periods List */}
                            <div className={collapsedTerms[tIdx] ? 'hidden' : 'space-y-4'}>
                                {periods.length === 0 ? (
                                    <div className="p-6 text-center border-2 border-dashed border-slate-200 dark:border-zinc-700/60 rounded-xl space-y-2 bg-slate-50/40 dark:bg-zinc-800/20">
                                        <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                            No grading periods declared for this term yet.
                                        </p>
                                        <p className="text-xs text-slate-500">
                                            Click &ldquo;Add Period&rdquo; to manually add a grading period (e.g. Prelim, Midterm, Finals).
                                        </p>
                                        {!disabled && (
                                            <div className="pt-1 flex justify-center">
                                                <CommonButton
                                                    color="primary"
                                                    size="small"
                                                    startIcon={<PlusIcon className="w-3.5 h-3.5" />}
                                                    variant="contained"
                                                    onClick={() => handleAddPeriod(tIdx)}
                                                >
                                                    Add Period
                                                </CommonButton>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    periods.map((period, pIdx) => {
                                        const prevPeriod = pIdx > 0
                                        ? periods[pIdx - 1]
                                        : null;

                                    const periodErrors = (errors.terms as any)?.[tIdx]?.grading_periods?.[pIdx];

                                    // Duplicate name check
                                    const isDuplicateName = periods.some(
                                        (p, idx) => idx !== pIdx && p.name && p.name.trim()
                                            .toLowerCase() === period.name.trim()
                                            .toLowerCase()
                                    );

                                    // Preceding period conflict
                                    const hasPrecedingConflict = Boolean(
                                        prevPeriod
                                        && period.start_date
                                        && prevPeriod.end_date
                                        && new Date(period.start_date) < new Date(prevPeriod.end_date)
                                    );

                                    // Date order error
                                    const hasDateOrderError = Boolean(
                                        period.start_date
                                        && period.end_date
                                        && new Date(period.end_date) <= new Date(period.start_date)
                                    );

                                    // Outside term bounds error
                                    const isOutsideTerm = Boolean(
                                        (term.start_date && period.start_date && new Date(period.start_date) < new Date(term.start_date))
                                        || (term.end_date && period.end_date && new Date(period.end_date) > new Date(term.end_date))
                                    );

                                    // Components weight total check
                                    const components = period.components || [];
                                    const compTotalWeight = components.reduce((sum, c) => sum + (Number(c.weight) || 0), 0);
                                    const isCompBalanced = components.length === 0 || compTotalWeight === 100;

                                    return (
                                        <div
                                            className={`p-4 rounded-xl border flex flex-col gap-3 transition-colors ${
                                                isDuplicateName || hasPrecedingConflict || hasDateOrderError || isOutsideTerm || !isCompBalanced
                                                    ? 'border-amber-300 dark:border-amber-700/70 bg-amber-50/20 dark:bg-amber-950/10'
                                                    : 'border-slate-200 dark:border-zinc-700 bg-slate-50/60 dark:bg-zinc-800/40'
                                            }`}
                                            key={period.id || `term_${tIdx}_period_${pIdx}`}
                                        >
                                            {/* Row 1: Entry number and action buttons */}
                                            <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-zinc-700/50 pb-2.5">
                                                <div className="flex items-center gap-2 flex-wrap min-w-0">
                                                    <span className="w-6 h-6 rounded-md bg-slate-200 dark:bg-zinc-700 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center justify-center shrink-0">
                                                        #{period.sequence}
                                                    </span>
                                                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                                                        {period.name || `Period #${period.sequence}`}
                                                    </span>
                                                    {Number(period.weight) > 0 && (
                                                        <span className="text-xs font-semibold text-brand-600 dark:text-brand-400">
                                                            ({period.weight}%)
                                                        </span>
                                                    )}
                                                    {period.start_date && period.end_date && (
                                                        <span className="text-[11px] text-slate-500 dark:text-slate-400">
                                                            • {period.start_date} to {period.end_date}
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="flex items-center gap-1.5 shrink-0">
                                                    {!disabled && (
                                                        <CommonButton
                                                            color="error"
                                                            size="small"
                                                            startIcon={<TrashIcon className="w-3.5 h-3.5" />}
                                                            title="Remove period"
                                                            variant="outlined"
                                                            onClick={() => {
                                                                setDeletePeriodTarget({
                                                                    termIndex: tIdx,
                                                                    periodIndex: pIdx,
                                                                    name: period.name || `Period #${period.sequence}`
                                                                });
                                                            }}
                                                        >
                                                            <span className="hidden sm:inline">Remove</span>
                                                        </CommonButton>
                                                    )}
                                                    <button
                                                        className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 font-medium flex items-center gap-1 p-1.5 rounded-lg hover:bg-slate-200/60 dark:hover:bg-zinc-700/50 transition-colors cursor-pointer"
                                                        title={collapsedPeriods[`${tIdx}_${pIdx}`] ? 'Expand period' : 'Collapse period'}
                                                        type="button"
                                                        aria-label={collapsedPeriods[`${tIdx}_${pIdx}`] ? 'Expand period' : 'Collapse period'}
                                                        onClick={() => togglePeriodCollapse(`${tIdx}_${pIdx}`)}
                                                    >
                                                        <CaretDownIcon
                                                            className={`w-4 h-4 transition-transform duration-200 ${collapsedPeriods[`${tIdx}_${pIdx}`] ? '-rotate-90' : 'rotate-0'}`}
                                                            weight="bold"
                                                        />
                                                        <span className="text-xs hidden sm:inline">{collapsedPeriods[`${tIdx}_${pIdx}`] ? 'Expand' : 'Collapse'}</span>
                                                    </button>
                                                </div>
                                            </div>

                                            <div className={collapsedPeriods[`${tIdx}_${pIdx}`] ? 'hidden' : 'flex flex-col gap-3'}>

                                            {/* Row 2: Period name and weight */}
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                <div>
                                                    <CommonInput
                                                        description="Descriptive name of the grading period (e.g. Prelim, Midterm, Finals)."
                                                        disabled={disabled}
                                                        error={Boolean(isDuplicateName || periodErrors?.name)}
                                                        fullWidth
                                                        helperText={isDuplicateName
                                                            ? 'Duplicate name in this term'
                                                            : periodErrors?.name?.message}
                                                        inputRef={(el) => {
                                                            const itemKey = period.id || `term_${tIdx}_period_${pIdx}`;
                                                            if (focusTarget?.type === 'period' && focusTarget.key === itemKey && el) {
                                                                el.focus();
                                                                setFocusTarget(null);
                                                            }
                                                        }}
                                                        isRequired
                                                        label="Period Name"
                                                        name={`terms.${tIdx}.grading_periods.${pIdx}.name`}
                                                        placeholder="e.g. Prelim, Midterm, Finals"
                                                        size="small"
                                                        value={period.name}
                                                        onChange={(e) => handleUpdatePeriod(tIdx, pIdx, { name: e.target.value })}
                                                    />
                                                </div>

                                                <div>
                                                    <CommonNumberInput
                                                        description="Percentage contribution toward the final term grade. Sum of all periods in a term must equal 100%."
                                                        disabled={disabled}
                                                        error={Boolean(periodErrors?.weight)}
                                                        fullWidth
                                                        helperText={periodErrors?.weight?.message}
                                                        isRequired
                                                        label="Weight (%)"
                                                        max={100}
                                                        min={0}
                                                        name={`terms.${tIdx}.grading_periods.${pIdx}.weight`}
                                                        size="small"
                                                        suffixText="%"
                                                        value={period.weight ?? ''}
                                                        onChange={(val) => handleUpdatePeriod(tIdx, pIdx, { weight: val as any })}
                                                    />
                                                </div>
                                            </div>

                                            {/* Row 3: Start and End Date */}
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                <div>
                                                    <CommonDatePicker
                                                        description="Opening date for coursework and assessment recording in this grading period."
                                                        disabled={disabled}
                                                        error={Boolean(hasPrecedingConflict || periodErrors?.start_date)}
                                                        helperText={hasPrecedingConflict
                                                            ? `Overlaps with #${pIdx} end date`
                                                            : periodErrors?.start_date?.message}
                                                        isRequired
                                                        label="Period Start Date"
                                                        size="small"
                                                        slotProps={{ textField: { name: `terms.${tIdx}.grading_periods.${pIdx}.start_date` } }}
                                                        value={period.start_date || ''}
                                                        onChange={(val) => handleUpdatePeriodDate(tIdx, pIdx, 'start_date', val)}
                                                    />
                                                </div>

                                                <div>
                                                    <CommonDatePicker
                                                        description="Cut-off date for exams and grade input for this period."
                                                        disabled={disabled}
                                                        error={Boolean(hasDateOrderError || periodErrors?.end_date)}
                                                        helperText={hasDateOrderError
                                                            ? 'Must be after start date'
                                                            : periodErrors?.end_date?.message}
                                                        isRequired
                                                        label="Period End Date"
                                                        size="small"
                                                        slotProps={{ textField: { name: `terms.${tIdx}.grading_periods.${pIdx}.end_date` } }}
                                                        value={period.end_date || ''}
                                                        onChange={(val) => handleUpdatePeriodDate(tIdx, pIdx, 'end_date', val)}
                                                    />
                                                </div>
                                            </div>

                                            {/* Row 4: Major Examination Day(s) & Grade Encoding Range */}
                                            <div className="pt-2 border-t border-slate-200/50 dark:border-zinc-700/40 grid grid-cols-1 md:grid-cols-2 gap-4">
                                                {/* Major Examination Days */}
                                                <div className="space-y-1.5 bg-slate-100/70 dark:bg-zinc-800/60 p-2.5 rounded-lg border border-slate-200/80 dark:border-zinc-700/50">
                                                    <div className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                                                        <span>Major Examination Day(s)</span>
                                                        <span className="inline-flex align-middle ml-1 whitespace-nowrap">
                                                            <CommonInfoTooltip content="Date or date range reserved for major examinations (e.g. Midterm Exams, Final Exams)." size={12} />
                                                        </span>
                                                    </div>
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                        <div>
                                                            <CommonDatePicker
                                                                disabled={disabled}
                                                                label="Exam Start"
                                                                size="small"
                                                                slotProps={{ textField: { name: `terms.${tIdx}.grading_periods.${pIdx}.major_exam_start_date` } }}
                                                                value={period.major_exam_start_date || ''}
                                                                onChange={(val) => handleUpdatePeriod(tIdx, pIdx, { major_exam_start_date: val })}
                                                            />
                                                        </div>
                                                        <div>
                                                            <CommonDatePicker
                                                                disabled={disabled}
                                                                error={Boolean(periodErrors?.major_exam_end_date)}
                                                                helperText={periodErrors?.major_exam_end_date?.message}
                                                                label="Exam End"
                                                                size="small"
                                                                slotProps={{ textField: { name: `terms.${tIdx}.grading_periods.${pIdx}.major_exam_end_date` } }}
                                                                value={period.major_exam_end_date || ''}
                                                                onChange={(val) => handleUpdatePeriod(tIdx, pIdx, { major_exam_end_date: val })}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Grade Encoding Range */}
                                                <div className="space-y-1.5 bg-slate-100/70 dark:bg-zinc-800/60 p-2.5 rounded-lg border border-slate-200/80 dark:border-zinc-700/50">
                                                    <div className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                                                        <span>Grade Encoding Range</span>
                                                        <span className="inline-flex align-middle ml-1 whitespace-nowrap">
                                                            <CommonInfoTooltip content="Official window during which faculty members can encode and submit grades for this period." size={12} />
                                                        </span>
                                                    </div>
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                        <div>
                                                            <CommonDatePicker
                                                                disabled={disabled}
                                                                label="Encoding Start"
                                                                size="small"
                                                                slotProps={{ textField: { name: `terms.${tIdx}.grading_periods.${pIdx}.grade_encoding_start_date` } }}
                                                                value={period.grade_encoding_start_date || ''}
                                                                onChange={(val) => handleUpdatePeriod(tIdx, pIdx, { grade_encoding_start_date: val })}
                                                            />
                                                        </div>
                                                        <div>
                                                            <CommonDatePicker
                                                                disabled={disabled}
                                                                error={Boolean(periodErrors?.grade_encoding_end_date)}
                                                                helperText={periodErrors?.grade_encoding_end_date?.message}
                                                                label="Encoding End"
                                                                size="small"
                                                                slotProps={{ textField: { name: `terms.${tIdx}.grading_periods.${pIdx}.grade_encoding_end_date` } }}
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
                                                            <span className="inline-flex align-middle ml-1 whitespace-nowrap">
                                                                <CommonInfoTooltip
                                                                    className="shrink-0"
                                                                    content="Component weight breakdown for this grading period (e.g., Quizzes: 30%, Performance Tasks: 30%, Major Exam: 40%). Total component weight must equal 100%."
                                                                    size={13}
                                                                />
                                                            </span>
                                                        </div>

                                                        {/* Simple 100/100 badge - positioned on right side in mobile and desktop */}
                                                        <span
                                                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold shrink-0 ml-auto ${
                                                                isCompBalanced
                                                                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                                                                    : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                                                            }`}
                                                        >
                                                            {isCompBalanced
                                                                ? (
                                                                    <CheckCircleIcon className="w-3.5 h-3.5 text-emerald-600" />
                                                                )
                                                                : (
                                                                    <WarningCircleIcon className="w-3.5 h-3.5 text-amber-600" />
                                                                )}
                                                            <span>{compTotalWeight}/100</span>
                                                        </span>
                                                    </div>

                                                    {!disabled && (
                                                        <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap justify-end">
                                                            <button
                                                                aria-label="Add Component"
                                                                className="text-[11px] p-1.5 sm:px-2 sm:py-0.5 rounded bg-brand-50 hover:bg-brand-100 dark:bg-brand-950/40 dark:hover:bg-brand-900/50 text-brand-700 dark:text-brand-300 font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                                                                title="Add Component"
                                                                type="button"
                                                                onClick={() => handleAddComponent(tIdx, pIdx)}
                                                            >
                                                                <PlusIcon className="w-3.5 h-3.5" />
                                                                <span className="hidden sm:inline">Add Component</span>
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Component Items List */}
                                                {components.length === 0
                                                    ? (
                                                        <div className="p-3 text-center rounded-lg border border-dashed border-slate-200 dark:border-zinc-700/60 bg-white/50 dark:bg-zinc-800/30">
                                                            <p className="text-xs text-slate-500">No component breakdown declared yet.</p>
                                                            {!disabled && (
                                                                <div className="flex flex-wrap items-center justify-center gap-3 mt-1.5">
                                                                    <button
                                                                        className="text-xs text-brand-600 dark:text-brand-400 font-semibold underline cursor-pointer"
                                                                        type="button"
                                                                        onClick={() => handleAddComponent(tIdx, pIdx)}
                                                                    >
                                                                        + Add Component
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )
                                                    : (
                                                        <div className="space-y-2">
                                                            {components.map((comp, cIdx) => (
                                                                <div
                                                                    className="flex flex-col sm:flex-row sm:items-center gap-2.5 sm:gap-2 bg-white dark:bg-zinc-800 p-2.5 sm:p-2 rounded-lg border border-slate-200 dark:border-zinc-700"
                                                                    key={comp.id || `comp_${tIdx}_${pIdx}_${cIdx}`}
                                                                >
                                                                    {/* Mobile Entry Header: Badge & Delete button */}
                                                                    <div className="flex items-center justify-between sm:hidden w-full">
                                                                        <div className="flex items-center gap-1.5">
                                                                            <span className="w-5 h-5 rounded bg-slate-100 dark:bg-zinc-700 text-slate-600 dark:text-slate-300 text-[10px] font-bold flex items-center justify-center shrink-0">
                                                                                c{cIdx + 1}
                                                                            </span>
                                                                            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                                                                Component #{cIdx + 1}
                                                                            </span>
                                                                        </div>
                                                                        {!disabled && (
                                                                            <button
                                                                                className="p-1 text-slate-400 hover:text-red-500 transition-colors cursor-pointer"
                                                                                title="Remove component"
                                                                                type="button"
                                                                                onClick={() => handleRemoveComponent(tIdx, pIdx, cIdx)}
                                                                            >
                                                                                <TrashIcon className="w-4 h-4" />
                                                                            </button>
                                                                        )}
                                                                    </div>

                                                                    {/* Desktop Badge */}
                                                                    <span className="hidden sm:flex w-5 h-5 rounded bg-slate-100 dark:bg-zinc-700 text-slate-600 dark:text-slate-300 text-[10px] font-bold items-center justify-center shrink-0">
                                                                        c{cIdx + 1}
                                                                    </span>

                                                                    {/* Field 1: Component Name */}
                                                                    <div className="w-full sm:flex-1">
                                                                        <span className="block sm:hidden text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                                                                            Component Name
                                                                        </span>
                                                                        <CommonInput
                                                                            containerClassName="w-full"
                                                                            disabled={disabled}
                                                                            fullWidth
                                                                            inputRef={(el) => {
                                                                                const itemKey = comp.id || `comp_${tIdx}_${pIdx}_${cIdx}`;
                                                                                if (focusTarget?.type === 'component' && focusTarget.key === itemKey && el) {
                                                                                    el.focus();
                                                                                    setFocusTarget(null);
                                                                                }
                                                                            }}
                                                                            placeholder="e.g. Quizzes, Midterm Exam, Recitation"
                                                                            size="small"
                                                                            value={comp.name}
                                                                            onChange={(e) => handleUpdateComponentItem(tIdx, pIdx, cIdx, { name: e.target.value })}
                                                                        />
                                                                    </div>

                                                                    {/* Field 2: Weight */}
                                                                    <div className="w-full sm:w-28 sm:shrink-0">
                                                                        <span className="block sm:hidden text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                                                                            Weight (%)
                                                                        </span>
                                                                        <CommonNumberInput
                                                                            containerClassName="w-full"
                                                                            disabled={disabled}
                                                                            fullWidth
                                                                            max={100}
                                                                            min={0}
                                                                            placeholder="Weight"
                                                                            size="small"
                                                                            suffixText="%"
                                                                            value={comp.weight ?? ''}
                                                                            onChange={(val) => handleUpdateComponentItem(tIdx, pIdx, cIdx, { weight: val as any })}
                                                                        />
                                                                    </div>

                                                                    {/* Desktop Remove Button */}
                                                                    {!disabled && (
                                                                        <button
                                                                            className="hidden sm:block p-1 text-slate-400 hover:text-red-500 transition-colors cursor-pointer shrink-0"
                                                                            title="Remove component"
                                                                            type="button"
                                                                            onClick={() => handleRemoveComponent(tIdx, pIdx, cIdx)}
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
                                        </div>
                                    );
                                }))}
                            </div>
                        </div>
                    );
                })}
            </div>


            {/* Delete Period Prompt Modal */}
            <DeletePromptModal
                formButtonsProps={{
                    cancelProps: {
                        onClick: () => setDeletePeriodTarget(null)
                    },
                    confirmProps: {
                        onClick: () => {
                            if (deletePeriodTarget !== null) {
                                handleRemovePeriod(deletePeriodTarget.termIndex, deletePeriodTarget.periodIndex);
                                setDeletePeriodTarget(null);
                            }
                        }
                    }
                }}
                isOpen={Boolean(deletePeriodTarget)}
                mainContent={{
                    title: 'Delete Grading Period?'
                }}
                open={Boolean(deletePeriodTarget)}
                subContent={{
                    title: `Are you sure you want to delete "${deletePeriodTarget?.name}"? All component weights configured inside will be removed.`
                }}
                onClose={() => setDeletePeriodTarget(null)}
            />
        </div>
    );
}