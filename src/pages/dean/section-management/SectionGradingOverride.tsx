import CommonButton from '@components/button/CommonButton';
import CommonInput from '@components/input/CommonInput';
import CommonNumberInput from '@components/input/CommonNumberInput';
import {
    ArrowCounterClockwiseIcon,
    CheckCircleIcon,
    InfoIcon,
    PlusCircleIcon,
    ScalesIcon,
    SlidersIcon,
    TrashIcon,
    WarningCircleIcon
} from '@phosphor-icons/react';
import { getGradingPeriodTemplates } from '@services/grading-config.service';
import { SectionFormValues, SectionGradingPeriodOverride } from '@type/section.type';
import { clearFieldError } from '@utils/form.util';
import { componentRailColor } from '@utils/period-allocation.util';
import { useEffect, useState } from 'react';
import { Control, useController, useFormState, useWatch } from 'react-hook-form';

interface SectionGradingOverrideProps {
    control: Control<SectionFormValues>;
    currentSectionId?: string;
    disabled?: boolean;
}

const DEFAULT_FALLBACK_PERIODS: SectionGradingPeriodOverride[] = [
    {
        name: 'Prelim',
        sequence: 1,
        weight: 30,
        components: [
            { name: 'Quizzes', weight: 30 },
            { name: 'Class Standing', weight: 30 },
            { name: 'Major Exam', weight: 40 }
        ]
    },
    {
        name: 'Midterm',
        sequence: 2,
        weight: 30,
        components: [
            { name: 'Quizzes', weight: 30 },
            { name: 'Class Standing', weight: 30 },
            { name: 'Major Exam', weight: 40 }
        ]
    },
    {
        name: 'Final',
        sequence: 3,
        weight: 40,
        components: [
            { name: 'Quizzes', weight: 30 },
            { name: 'Class Standing', weight: 30 },
            { name: 'Major Exam', weight: 40 }
        ]
    }
];

export default function SectionGradingOverride({
    control,
    disabled = false
}: SectionGradingOverrideProps) {

    const overrideEnabled = useWatch({ control, name: 'override_grading_schema' });

    const {
        field: { onChange: onOverrideChange }
    } = useController({ control, name: 'override_grading_schema' });

    const {
        field: { value: periodsValue, onChange: onPeriodsChange }
    } = useController({ control, name: 'grading_periods' });

    // Step validation (SectionWizardModal.validateStep3) sets errors on these paths
    const { errors } = useFormState({ control });
    const periodErrors = errors.grading_periods as any;

    const [defaultPeriods, setDefaultPeriods] = useState<SectionGradingPeriodOverride[]>(DEFAULT_FALLBACK_PERIODS);

    // Fetch template periods for display without mutating form state unless override is enabled
    useEffect(function() {
        let isMounted = true;
        async function fetchTemplates() {
            const res = await getGradingPeriodTemplates();
            if (!isMounted) return;
            if (res.data && res.data.length > 0) {
                const mapped: SectionGradingPeriodOverride[] = res.data.map((item, idx) => ({
                    id: item.id,
                    name: item.name || `Period ${idx + 1}`,
                    sequence: item.sequence || idx + 1,
                    weight: Number(item.weight) || 0,
                    components: (item.components || []).map((comp) => ({
                        name: comp.name,
                        weight: Number(comp.weight) || 0
                    }))
                }));
                setDefaultPeriods(mapped);
            }
        }
        fetchTemplates();
        return function() {
            isMounted = false;
        };
    }, []);

    const periods: SectionGradingPeriodOverride[] = (periodsValue && periodsValue.length > 0)
        ? periodsValue
        : defaultPeriods;

    function enableOverrideIfNeeded() {
        if (!overrideEnabled) {
            onOverrideChange(true);
        }
    }

    function handleSetDefault() {
        onOverrideChange(false);
        onPeriodsChange([]);
    }

    function handleAddComponent(periodIndex: number) {
        enableOverrideIfNeeded();
        const target = periods[periodIndex];
        if (!target) return;

        const updated = [...periods];
        updated[periodIndex] = {
            ...target,
            components: [
                ...target.components,
                { name: '', weight: 0 }
            ]
        };
        onPeriodsChange(updated);
    }

    function handleRemoveComponent(periodIndex: number, compIndex: number) {
        enableOverrideIfNeeded();
        const target = periods[periodIndex];
        if (!target) return;

        const updated = [...periods];
        updated[periodIndex] = {
            ...target,
            components: target.components.filter((_, idx) => idx !== compIndex)
        };
        onPeriodsChange(updated);
    }

    function handleUpdateComponent(
        periodIndex: number,
        compIndex: number,
        patch: { name?: string; weight?: number }
    ) {
        enableOverrideIfNeeded();
        const target = periods[periodIndex];
        if (!target) return;

        Object.keys(patch).forEach(function(key) {
            clearFieldError(control, `grading_periods.${periodIndex}.components.${compIndex}.${key}`);
        });
        clearFieldError(control, `grading_periods.${periodIndex}.weight`);

        const updated = [...periods];
        const newComps = [...target.components];
        newComps[compIndex] = {
            ...newComps[compIndex],
            ...patch
        };
        updated[periodIndex] = {
            ...target,
            components: newComps
        };
        onPeriodsChange(updated);
    }

    function handleBalancePeriod(periodIndex: number) {
        enableOverrideIfNeeded();
        const target = periods[periodIndex];
        if (!target || target.components.length === 0) return;

        const count = target.components.length;
        const equalShare = Math.floor(100 / count);
        const remainder = 100 - (equalShare * count);

        const balancedComponents = target.components.map((comp, idx) => ({
            ...comp,
            weight: idx === count - 1
                ? equalShare + remainder
                : equalShare
        }));

        const updated = [...periods];
        updated[periodIndex] = {
            ...target,
            components: balancedComponents
        };
        onPeriodsChange(updated);
    }

    return (
        <div className="col-span-1 md:col-span-2 flex flex-col gap-4 p-3.5 sm:p-4 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-800/30">
            {/* Header & Status (Indicates if overridden or inheriting program defaults) */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-zinc-800 pb-3">
                <div className="flex items-center gap-2.5">
                    <SlidersIcon className="w-5 h-5 text-brand-600 dark:text-brand-400 shrink-0" weight="bold" />
                    <div>
                        <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex flex-wrap items-center gap-2">
                            Grading Schema Settings
                            {overrideEnabled
                                ? (
                                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                                    Section Override Active
                                    </span>
                                )
                                : (
                                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                        <CheckCircleIcon className="w-3.5 h-3.5" /> Inheriting Program Defaults
                                    </span>
                                )}
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            {overrideEnabled
                                ? 'Custom grading schema override active for this section.'
                                : 'Default: Inheriting program grading schema settings. Modifying any value will set section override.'}
                        </p>
                    </div>
                </div>

                {overrideEnabled && !disabled && (
                    <CommonButton
                        className="w-full sm:w-auto"
                        color="inherit"
                        size="small"
                        startIcon={<ArrowCounterClockwiseIcon className="w-4 h-4" />}
                        variant="outlined"
                        onClick={handleSetDefault}
                    >
                        Default (Inherit)
                    </CommonButton>
                )}
            </div>

            {/* Schema Configuration */}
            <div className="flex flex-col gap-4 pt-1">
                {disabled
                    ? (
                        /* Read-Only Mode: Show Inherited / Section Grading Schema Breakdown */
                        <div className="flex flex-col gap-4">
                            <div className="flex items-start gap-2 p-3 rounded-xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 text-xs text-blue-800 dark:text-blue-200">
                                <InfoIcon className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                                <div>
                                    <span className="font-bold">
                                        {overrideEnabled
                                            ? 'Custom Section Grading Schema'
                                            : 'Inherited Program Grading Schema'}
                                    </span>
                                    <p className="mt-0.5 text-blue-700 dark:text-blue-300">
                                        {overrideEnabled
                                            ? 'This section uses a custom section-level grading override.'
                                            : 'Below are the active inherited grading period components and weight settings.'}
                                    </p>
                                </div>
                            </div>

                            <div className="flex flex-col gap-3">
                                {periods.map((period, pIdx) => {
                                    const totalCompWeight = (period.components || []).reduce(
                                        (sum, c) => sum + (Number(c.weight) || 0),
                                        0
                                    );
                                    return (
                                        <div
                                            className="p-4 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/80 shadow-xs flex flex-col gap-3"
                                            key={period.id || pIdx}
                                        >
                                            <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-700 pb-2">
                                                <div className="flex items-center gap-2">
                                                    <span className="w-6 h-6 rounded-md bg-brand-100 dark:bg-brand-900/50 text-brand-700 dark:text-brand-300 text-xs font-bold flex items-center justify-center">
                                                    #{period.sequence}
                                                    </span>
                                                    <span className="font-bold text-sm text-slate-900 dark:text-slate-100">
                                                        {period.name} Period
                                                    </span>
                                                </div>
                                                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                                Total Weight: {totalCompWeight}%
                                                </span>
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                                                {period.components.map((comp, cIdx) => (
                                                    <div
                                                        className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-zinc-900/60 border border-slate-100 dark:border-zinc-700/60"
                                                        key={cIdx}
                                                    >
                                                        <div className="flex items-center gap-2 min-w-0">
                                                            <span
                                                                className="rounded-sm shrink-0 size-2.5"
                                                                style={{ background: componentRailColor(cIdx) }}
                                                            />
                                                            <span className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate">
                                                                {comp.name}
                                                            </span>
                                                        </div>
                                                        <span className="text-xs font-bold text-brand-600 dark:text-brand-400 shrink-0 ml-2">
                                                            {comp.weight}%
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )
                    : (
                    /* Edit Mode: Component Weights */
                        <div className="flex flex-col gap-4">

                            {/* Component Weight Configuration Header */}
                            <div className="flex items-start gap-2 text-xs text-slate-500 dark:text-slate-400 pt-1">
                                <InfoIcon className="w-4 h-4 text-brand-600 shrink-0 mt-0.5" />
                                <span>
                                Configure grading components per grading period. Each period&apos;s component weights must strictly total <strong>100%</strong>.
                                </span>
                            </div>

                            {/* Period Breakdown Cards */}
                            <div className="flex flex-col gap-4">
                                {periods.map((period, pIdx) => {
                                    const totalCompWeight = (period.components || []).reduce(
                                        (sum, c) => sum + (Number(c.weight) || 0),
                                        0
                                    );
                                    const isBalanced = totalCompWeight === 100;
                                    const shortfall = 100 - totalCompWeight;

                                    return (
                                        <div
                                            className="p-3 sm:p-3.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/80 shadow-xs flex flex-col gap-3"
                                            key={period.id || pIdx}
                                        >
                                            {/* Period Title & Badge */}
                                            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 dark:border-zinc-700 pb-2">
                                                <div className="flex items-center gap-2">
                                                    <span className="w-5 h-5 rounded-md bg-brand-100 dark:bg-brand-900/50 text-brand-700 dark:text-brand-300 text-xs font-bold flex items-center justify-center">
                                                    #{period.sequence}
                                                    </span>
                                                    <span className="font-semibold text-sm text-slate-900 dark:text-slate-100">
                                                        {period.name} Period
                                                    </span>
                                                </div>

                                                <div className="flex items-center gap-2">
                                                    <span
                                                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                                                            isBalanced
                                                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                                                                : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                                                        }`}
                                                    >
                                                        {isBalanced
                                                            ? (
                                                                <CheckCircleIcon className="w-3.5 h-3.5 text-emerald-600" />
                                                            )
                                                            : (
                                                                <WarningCircleIcon className="w-3.5 h-3.5 text-amber-600" />
                                                            )}
                                                        {isBalanced
                                                            ? '100% Balanced'
                                                            : shortfall > 0
                                                                ? `${shortfall}% unassigned`
                                                                : `${Math.abs(shortfall)}% over`}
                                                    </span>

                                                    {!disabled && (
                                                        <CommonButton
                                                            color="primary"
                                                            disabled={isBalanced || period.components.length === 0}
                                                            size="xsmall"
                                                            startIcon={<ScalesIcon weight="bold" />}
                                                            variant="text"
                                                            onClick={() => handleBalancePeriod(pIdx)}
                                                        >
                                                        Distribute
                                                        </CommonButton>
                                                    )}
                                                </div>
                                            </div>

                                            {periodErrors?.[pIdx]?.weight?.message && (
                                                <p className="text-xs font-medium text-(--mui-palette-error-main)" role="alert">
                                                    {periodErrors[pIdx].weight.message}
                                                </p>
                                            )}

                                            {/* Component items */}
                                            <div className="flex flex-col gap-2.5 sm:gap-2">
                                                {period.components.map((comp, cIdx) => (
                                                    <div
                                                        className="flex flex-col sm:flex-row sm:items-center gap-2.5 sm:gap-2 p-3 sm:p-0 rounded-lg sm:rounded-none bg-slate-50/70 sm:bg-transparent dark:bg-zinc-900/40 sm:dark:bg-transparent border border-slate-200/60 sm:border-0 dark:border-zinc-700/60"
                                                        key={cIdx}
                                                    >
                                                        {/* Mobile Header: Component indicator + Delete button */}
                                                        <div className="flex items-center justify-between sm:hidden w-full pb-0.5">
                                                            <div className="flex items-center gap-1.5">
                                                                <span
                                                                    className="rounded-sm shrink-0 size-2.5"
                                                                    style={{ background: componentRailColor(cIdx) }}
                                                                />
                                                                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                                                    Component #{cIdx + 1}
                                                                </span>
                                                            </div>
                                                            {!disabled && period.components.length > 1 && (
                                                                <CommonButton
                                                                    aria-label="Remove component"
                                                                    color="error"
                                                                    size="xsmall"
                                                                    startIcon={<TrashIcon weight="bold" />}
                                                                    variant="text"
                                                                    onClick={() => handleRemoveComponent(pIdx, cIdx)}
                                                                >
                                                                    <span className="text-xs">Remove</span>
                                                                </CommonButton>
                                                            )}
                                                        </div>

                                                        {/* Desktop Color Rail Indicator */}
                                                        <span
                                                            className="hidden sm:inline-block rounded-sm shrink-0 size-2.5"
                                                            style={{ background: componentRailColor(cIdx) }}
                                                        />

                                                        {/* Field 1: Component Name */}
                                                        <div className="w-full sm:flex-1 min-w-0">
                                                            <span className="block sm:hidden text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                                                                Component Name
                                                            </span>
                                                            <CommonInput
                                                                containerClassName="w-full"
                                                                disabled={disabled}
                                                                error={Boolean(periodErrors?.[pIdx]?.components?.[cIdx]?.name)}
                                                                fullWidth
                                                                helperText={periodErrors?.[pIdx]?.components?.[cIdx]?.name?.message}
                                                                name={`grading_periods.${pIdx}.components.${cIdx}.name`}
                                                                placeholder="e.g., Quizzes, Midterm Exam, Recitation"
                                                                size="small"
                                                                value={comp.name}
                                                                onChange={(e) =>
                                                                    handleUpdateComponent(pIdx, cIdx, {
                                                                        name: e.target.value
                                                                    })
                                                                }
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
                                                                error={Boolean(periodErrors?.[pIdx]?.components?.[cIdx]?.weight)}
                                                                fullWidth
                                                                helperText={periodErrors?.[pIdx]?.components?.[cIdx]?.weight?.message}
                                                                max={100}
                                                                min={0}
                                                                name={`grading_periods.${pIdx}.components.${cIdx}.weight`}
                                                                placeholder="Weight"
                                                                size="small"
                                                                suffixText="%"
                                                                value={comp.weight ?? ''}
                                                                onChange={(val) =>
                                                                    handleUpdateComponent(pIdx, cIdx, {
                                                                        weight: val as any
                                                                    })
                                                                }
                                                            />
                                                        </div>

                                                        {/* Desktop Remove Button */}
                                                        {!disabled && period.components.length > 1 && (
                                                            <div className="hidden sm:block shrink-0">
                                                                <CommonButton
                                                                    aria-label="Remove component"
                                                                    color="error"
                                                                    size="xsmall"
                                                                    startIcon={<TrashIcon weight="bold" />}
                                                                    variant="text"
                                                                    onClick={() => handleRemoveComponent(pIdx, cIdx)}
                                                                />
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>

                                            {/* Add Component Button */}
                                            {!disabled && (
                                                <div className="pt-1">
                                                    <CommonButton
                                                        color="primary"
                                                        size="xsmall"
                                                        startIcon={<PlusCircleIcon weight="bold" />}
                                                        variant="text"
                                                        onClick={() => handleAddComponent(pIdx)}
                                                    >
                                                    Add component
                                                    </CommonButton>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
            </div>
        </div>
    );
}