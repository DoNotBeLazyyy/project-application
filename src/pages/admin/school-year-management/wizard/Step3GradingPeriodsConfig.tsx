import CommonButton from '@components/button/CommonButton';
import ValidCommonDatePicker from '@components/datepicker/ValidCommonDatepicker';
import ValidCommonInput from '@components/input/ValidCommonInput';
import ValidCommonNumberInput from '@components/input/ValidCommonNumberInput';
import DeletePromptModal from '@components/modal/DeletePromptModal';
import CommonInfoTooltip from '@components/tooltip/CommonInfoTooltip';
import {
    CaretDownIcon,
    CheckCircleIcon,
    ListPlusIcon,
    PlusIcon,
    TrashIcon,
    WarningCircleIcon
} from '@phosphor-icons/react';
import { AcademicYearWizardFormValues, WizardGradingPeriodComponentItem, WizardGradingPeriodItem } from '@type/school-year.type';
import { DateTime } from 'luxon';
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
    onChangeTerms
}: Step3GradingPeriodsConfigProps) {
    const terms = useWatch({ control, name: 'terms' }) || [];
    const [deletePeriodTarget, setDeletePeriodTarget] = useState<{ termIndex: number; periodIndex: number; name: string } | null>(null);
    const [focusFieldName, setFocusFieldName] = useState<string | null>(null);
    const [collapsedPeriods, setCollapsedPeriods] = useState<Record<string, boolean>>({});
    const [collapsedTerms, setCollapsedTerms] = useState<Record<number, boolean>>({});

    const { errors } = useFormState({ control });

    // Focus the name input of a newly added period / component once it is rendered
    useEffect(() => {
        if (!focusFieldName) return;
        const element = document.querySelector<HTMLInputElement>(`[name="${focusFieldName}"]`);
        if (element) {
            element.focus();
            setFocusFieldName(null);
        }
    }, [focusFieldName, terms]);

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
        setFocusFieldName(`terms.${termIndex}.grading_periods.${currentPeriods.length}.name`);
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

    // Replace the component list of a period (field values themselves are owned by the form inputs)
    function handleSetComponents(
        termIndex: number,
        periodIndex: number,
        components: WizardGradingPeriodComponentItem[]
    ) {
        const targetTerm = terms[termIndex];
        if (!targetTerm) return;

        const currentPeriods = [...(targetTerm.grading_periods || [])];
        currentPeriods[periodIndex] = {
            ...currentPeriods[periodIndex],
            components
        };

        const updatedTerms = [...terms];
        updatedTerms[termIndex] = {
            ...targetTerm,
            grading_periods: currentPeriods
        };

        onChangeTerms(updatedTerms);
    }

    // When a period end date is picked, push the succeeding period start date forward if it now overlaps
    function handleAdjustNextPeriodStart(termIndex: number, periodIndex: number, value: string) {
        const targetTerm = terms[termIndex];
        if (!targetTerm || !value) return;

        const currentPeriods = [...(targetTerm.grading_periods || [])];
        const nextPeriod = currentPeriods[periodIndex + 1];
        if (!nextPeriod || !nextPeriod.start_date || new Date(nextPeriod.start_date) >= new Date(value)) return;

        currentPeriods[periodIndex] = { ...currentPeriods[periodIndex], end_date: value };
        currentPeriods[periodIndex + 1] = {
            ...nextPeriod,
            end_date: nextPeriod.end_date && new Date(nextPeriod.end_date) <= new Date(value)
                ? (targetTerm.end_date || value)
                : nextPeriod.end_date,
            start_date: value
        };

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

        handleSetComponents(termIndex, periodIndex, [...currentComponents, newComponent]);
        setFocusFieldName(`terms.${termIndex}.grading_periods.${periodIndex}.components.${currentComponents.length}.name`);
    }

    // Remove component item from period
    function handleRemoveComponent(termIndex: number, periodIndex: number, compIndex: number) {
        const targetPeriod = terms[termIndex]?.grading_periods?.[periodIndex];
        if (!targetPeriod) return;

        const currentComponents = targetPeriod.components || [];
        handleSetComponents(termIndex, periodIndex, currentComponents.filter((_, idx) => idx !== compIndex));
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

                                    // Duplicate name check
                                    const isDuplicateName = periods.some(
                                        (p, idx) => idx !== pIdx && p.name && p.name.trim()
                                            .toLowerCase() === (period.name || '').trim()
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

                                            {/* Row 2: Period name (NOT NULL, unique per term) and weight (CHECK > 0 AND <= 100) */}
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                <div>
                                                    <ValidCommonInput
                                                        control={control}
                                                        description="Descriptive name of the grading period (e.g. Prelim, Midterm, Finals)."
                                                        disabled={disabled}
                                                        fullWidth
                                                        isRequired
                                                        label="Period Name"
                                                        name={`terms.${tIdx}.grading_periods.${pIdx}.name`}
                                                        placeholder="e.g. Prelim, Midterm, Finals"
                                                        rules={{
                                                            required: 'Period name is required',
                                                            validate: (val) => {
                                                                const clean = String(val || '').trim().toLowerCase();
                                                                if (!clean) return 'Period name is required';
                                                                const isDuplicate = periods.some(
                                                                    (p, idx) => idx !== pIdx && (p.name || '').trim().toLowerCase() === clean
                                                                );
                                                                return !isDuplicate || 'Duplicate name in this term';
                                                            }
                                                        }}
                                                    />
                                                </div>

                                                <div>
                                                    <ValidCommonNumberInput
                                                        control={control}
                                                        description="Percentage contribution toward the final term grade. Sum of all periods in a term must equal 100%."
                                                        disabled={disabled}
                                                        fullWidth
                                                        isRequired
                                                        label="Weight (%)"
                                                        max={100}
                                                        maxDecimals={2}
                                                        min={0}
                                                        name={`terms.${tIdx}.grading_periods.${pIdx}.weight`}
                                                        rules={{
                                                            max: { message: 'Weight cannot exceed 100%', value: 100 },
                                                            required: 'Weight is required',
                                                            validate: (val) => Number(val) > 0 || 'Weight must be greater than 0%'
                                                        }}
                                                        suffixText="%"
                                                    />
                                                </div>
                                            </div>

                                            {/* Row 3: Start and End Date (CHECK end_date > start_date) */}
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                <div>
                                                    <ValidCommonDatePicker
                                                        control={control}
                                                        description="Opening date for coursework and assessment recording in this grading period."
                                                        disabled={disabled}
                                                        isRequired
                                                        label="Period Start Date"
                                                        name={`terms.${tIdx}.grading_periods.${pIdx}.start_date`}
                                                        rules={{
                                                            required: 'Period start date is required',
                                                            validate: (val) => {
                                                                if (val && term.start_date && new Date(val as string) < new Date(term.start_date)) {
                                                                    return 'Cannot be before the term start date';
                                                                }
                                                                return true;
                                                            }
                                                        }}
                                                    />
                                                </div>

                                                <div>
                                                    <ValidCommonDatePicker
                                                        control={control}
                                                        description="Cut-off date for exams and grade input for this period."
                                                        disabled={disabled}
                                                        isRequired
                                                        label="Period End Date"
                                                        name={`terms.${tIdx}.grading_periods.${pIdx}.end_date`}
                                                        rules={{
                                                            required: 'Period end date is required',
                                                            validate: (val) => {
                                                                if (val && period.start_date && new Date(val as string) <= new Date(period.start_date)) {
                                                                    return 'Must be after start date';
                                                                }
                                                                if (val && term.end_date && new Date(val as string) > new Date(term.end_date)) {
                                                                    return 'Cannot be after the term end date';
                                                                }
                                                                return true;
                                                            }
                                                        }}
                                                        onAccept={(date: DateTime | null) => handleAdjustNextPeriodStart(tIdx, pIdx, date?.toISODate() || '')}
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
                                                            <ValidCommonDatePicker
                                                                control={control}
                                                                disabled={disabled}
                                                                label="Exam Start"
                                                                name={`terms.${tIdx}.grading_periods.${pIdx}.major_exam_start_date`}
                                                            />
                                                        </div>
                                                        <div>
                                                            <ValidCommonDatePicker
                                                                control={control}
                                                                disabled={disabled}
                                                                label="Exam End"
                                                                name={`terms.${tIdx}.grading_periods.${pIdx}.major_exam_end_date`}
                                                                rules={{
                                                                    validate: (val) => {
                                                                        if (val && period.major_exam_start_date && new Date(val as string) < new Date(period.major_exam_start_date)) {
                                                                            return 'Cannot be before exam start';
                                                                        }
                                                                        return true;
                                                                    }
                                                                }}
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
                                                            <ValidCommonDatePicker
                                                                control={control}
                                                                disabled={disabled}
                                                                label="Encoding Start"
                                                                name={`terms.${tIdx}.grading_periods.${pIdx}.grade_encoding_start_date`}
                                                            />
                                                        </div>
                                                        <div>
                                                            <ValidCommonDatePicker
                                                                control={control}
                                                                disabled={disabled}
                                                                label="Encoding End"
                                                                name={`terms.${tIdx}.grading_periods.${pIdx}.grade_encoding_end_date`}
                                                                rules={{
                                                                    validate: (val) => {
                                                                        if (val && period.grade_encoding_start_date && new Date(val as string) < new Date(period.grade_encoding_start_date)) {
                                                                            return 'Cannot be before encoding start';
                                                                        }
                                                                        return true;
                                                                    }
                                                                }}
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
                                                    ) : (
                                                        <div className="space-y-2">
                                                            {components.map((comp, cIdx) => {
                                                                return (
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

                                                                    {/* Field 1: Component Name (dense row: every control stays small) */}
                                                                    <div className="w-full sm:flex-1">
                                                                        <span className="block sm:hidden text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                                                                            Component Name
                                                                        </span>
                                                                        <ValidCommonInput
                                                                            containerClassName="w-full"
                                                                            control={control}
                                                                            disabled={disabled}
                                                                            fullWidth
                                                                            name={`terms.${tIdx}.grading_periods.${pIdx}.components.${cIdx}.name`}
                                                                            placeholder="e.g. Quizzes, Midterm Exam, Recitation"
                                                                            rules={{
                                                                                validate: (val) => Boolean(String(val || '').trim()) || 'Component name is required'
                                                                            }}
                                                                            size="small"
                                                                        />
                                                                    </div>

                                                                    {/* Field 2: Weight */}
                                                                    <div className="w-full sm:w-28 sm:shrink-0">
                                                                        <span className="block sm:hidden text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                                                                            Weight (%)
                                                                        </span>
                                                                        <ValidCommonNumberInput
                                                                            containerClassName="w-full"
                                                                            control={control}
                                                                            disabled={disabled}
                                                                            fullWidth
                                                                            max={100}
                                                                            maxDecimals={2}
                                                                            min={0}
                                                                            name={`terms.${tIdx}.grading_periods.${pIdx}.components.${cIdx}.weight`}
                                                                            placeholder="Weight"
                                                                            rules={{
                                                                                max: { message: 'Weight cannot exceed 100%', value: 100 },
                                                                                required: 'Weight is required',
                                                                                validate: (val) => Number(val) > 0 || 'Weight must be greater than 0%'
                                                                            }}
                                                                            size="small"
                                                                            suffixText="%"
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
                                                                );
                                                            })}

                                                            {!disabled && components.length > 0 && (
                                                                <div className="flex justify-start pt-1">
                                                                    <button
                                                                        aria-label="Add Component"
                                                                        className="text-xs px-2.5 py-1 rounded bg-brand-50 hover:bg-brand-100 dark:bg-brand-950/40 dark:hover:bg-brand-900/50 text-brand-700 dark:text-brand-300 font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
                                                                        title="Add Component"
                                                                        type="button"
                                                                        onClick={() => handleAddComponent(tIdx, pIdx)}
                                                                    >
                                                                        <PlusIcon className="w-3.5 h-3.5" />
                                                                        <span>Add Component</span>
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                            </div>
                                                </div>
                                        </div>
                                    );
                                }))}

                                {!disabled && periods.length > 0 && (
                                    <div className="flex justify-start pt-1">
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