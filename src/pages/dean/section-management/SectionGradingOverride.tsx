import CommonButton from '@components/button/CommonButton';
import CommonInput from '@components/input/CommonInput';
import ValidCommonSelect from '@components/select/ValidCommonSelect';
import { useSectionOptions } from '@pages/dean/section-management/useSectionOptions';
import {
    ArrowCounterClockwiseIcon,
    CheckCircleIcon,
    CopyIcon,
    InfoIcon,
    PlusCircleIcon,
    ScalesIcon,
    SlidersIcon,
    TrashIcon,
    WarningCircleIcon
} from '@phosphor-icons/react';
import { getGradingPeriodTemplates } from '@services/grading-config.service';
import { SectionFormValues, SectionGradingPeriodOverride } from '@type/section.type';
import { componentRailColor } from '@utils/period-allocation.util';
import { useEffect } from 'react';
import { Control, useController, useWatch } from 'react-hook-form';

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
    currentSectionId,
    disabled = false
}: SectionGradingOverrideProps) {
    const { sectionOptions } = useSectionOptions();

    const overrideEnabled = useWatch({ control, name: 'override_grading_schema' });
    const overrideMode = useWatch({ control, name: 'grading_override_mode' }) || 'copy_section';

    const {
        field: { onChange: onOverrideChange }
    } = useController({ control, name: 'override_grading_schema' });

    const {
        field: { onChange: onModeChange }
    } = useController({ control, name: 'grading_override_mode' });

    const {
        field: { value: periodsValue, onChange: onPeriodsChange }
    } = useController({ control, name: 'grading_periods' });

    const availableSectionOptions = sectionOptions.filter(
        (option) => option.value !== currentSectionId
    );

    // Initialize default periods whenever empty
    useEffect(function() {
        if (!periodsValue || periodsValue.length === 0) {
            async function fetchTemplates() {
                const res = await getGradingPeriodTemplates();
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
                    onPeriodsChange(mapped);
                } else {
                    onPeriodsChange(DEFAULT_FALLBACK_PERIODS);
                }
            }
            fetchTemplates();
        }
    }, [periodsValue, onPeriodsChange]);

    const periods: SectionGradingPeriodOverride[] = periodsValue || DEFAULT_FALLBACK_PERIODS;

    function enableOverrideIfNeeded() {
        if (!overrideEnabled) {
            onOverrideChange(true);
        }
    }

    function handleSetDefault() {
        onOverrideChange(false);
        onPeriodsChange([]);
    }

    function handleModeChange(mode: 'copy_section' | 'custom') {
        enableOverrideIfNeeded();
        onModeChange(mode);
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
                { name: `Component ${target.components.length + 1}`, weight: 0 }
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
            weight: idx === count - 1 ? equalShare + remainder : equalShare
        }));

        const updated = [...periods];
        updated[periodIndex] = {
            ...target,
            components: balancedComponents
        };
        onPeriodsChange(updated);
    }

    return (
        <div className="col-span-1 md:col-span-2 flex flex-col gap-4 p-4 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-800/30">
            {/* Header & Status */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-zinc-800 pb-3">
                <div className="flex items-center gap-2.5">
                    <SlidersIcon className="w-5 h-5 text-brand-600 dark:text-brand-400 shrink-0" weight="bold" />
                    <div>
                        <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                            Grading Schema Settings
                            {overrideEnabled ? (
                                <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                                    Section Override Active
                                </span>
                            ) : (
                                <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                    <CheckCircleIcon className="w-3.5 h-3.5" /> Inheriting Academic Year Defaults
                                </span>
                            )}
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            {overrideEnabled
                                ? 'Custom grading schema override active for this section.'
                                : 'Default: Inheriting system-wide grading schema. Modifying any value will set section override.'}
                        </p>
                    </div>
                </div>

                {overrideEnabled && !disabled && (
                    <CommonButton
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

            {/* Always Visible Schema Configuration */}
            <div className="flex flex-col gap-4 pt-1">
                {/* Mode Toggle Buttons */}
                {!disabled && (
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                            Override Mode:
                        </span>
                        <button
                            className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1.5 ${
                                overrideMode === 'copy_section'
                                    ? 'bg-brand-600 text-white shadow-sm'
                                    : 'bg-white dark:bg-zinc-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-zinc-700 hover:bg-slate-100 dark:hover:bg-zinc-700'
                            }`}
                            type="button"
                            onClick={() => handleModeChange('copy_section')}
                        >
                            <CopyIcon className="w-3.5 h-3.5" weight="bold" />
                            Copy from Existing Section
                        </button>
                        <button
                            className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1.5 ${
                                overrideMode === 'custom'
                                    ? 'bg-brand-600 text-white shadow-sm'
                                    : 'bg-white dark:bg-zinc-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-zinc-700 hover:bg-slate-100 dark:hover:bg-zinc-700'
                            }`}
                            type="button"
                            onClick={() => handleModeChange('custom')}
                        >
                            <SlidersIcon className="w-3.5 h-3.5" weight="bold" />
                            Custom Schema by Period
                        </button>
                    </div>
                )}

                {/* Mode 1: Copy from Section */}
                {overrideMode === 'copy_section' && (
                    <div className="flex flex-col gap-2 p-3 rounded-lg bg-white dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700">
                        <div className="flex items-start gap-2 text-xs text-slate-500 dark:text-slate-400 mb-1">
                            <InfoIcon className="w-4 h-4 text-brand-600 shrink-0 mt-0.5" />
                            <span>
                                Select an existing section below. Its grading components will be cloned into this section matched period by period.
                            </span>
                        </div>

                        <ValidCommonSelect
                            control={control}
                            disabled={disabled}
                            hasHelper
                            helperText="Source section to copy grading components from"
                            label="Source Section"
                            name="source_section_id"
                            options={availableSectionOptions}
                            placeholder="Select source section"
                            rules={
                                !disabled && overrideEnabled && overrideMode === 'copy_section'
                                    ? { required: 'Please select a source section' }
                                    : undefined
                            }
                        />
                    </div>
                )}

                {/* Mode 2: Custom Grading Periods Schema */}
                {overrideMode === 'custom' && (
                    <div className="flex flex-col gap-4">
                        <div className="flex items-start gap-2 text-xs text-slate-500 dark:text-slate-400">
                            <InfoIcon className="w-4 h-4 text-brand-600 shrink-0 mt-0.5" />
                            <span>
                                Configure grading components per grading period. Each period's component weights must strictly total <strong>100%</strong>.
                            </span>
                        </div>

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
                                        className="p-3.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/80 shadow-xs flex flex-col gap-3"
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
                                                    {isBalanced ? (
                                                        <CheckCircleIcon className="w-3.5 h-3.5 text-emerald-600" />
                                                    ) : (
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

                                        {/* Component items */}
                                        <div className="flex flex-col gap-2">
                                            {period.components.map((comp, cIdx) => (
                                                <div
                                                    className="flex items-center gap-2"
                                                    key={cIdx}
                                                >
                                                    <span
                                                        className="rounded-sm shrink-0 size-2.5"
                                                        style={{ background: componentRailColor(cIdx) }}
                                                    />
                                                    <div className="flex-1 min-w-0">
                                                        <CommonInput
                                                            containerClassName="w-full"
                                                            disabled={disabled}
                                                            fullWidth
                                                            placeholder="Component name (e.g. Quizzes)"
                                                            size="small"
                                                            value={comp.name}
                                                            onChange={(e) =>
                                                                handleUpdateComponent(pIdx, cIdx, {
                                                                    name: e.target.value
                                                                })
                                                            }
                                                        />
                                                    </div>

                                                    <div className="relative w-24 shrink-0">
                                                        <CommonInput
                                                            containerClassName="w-full"
                                                            disabled={disabled}
                                                            placeholder="Weight"
                                                            size="small"
                                                            slotProps={{ htmlInput: { min: 0, max: 100 } }}
                                                            type="number"
                                                            value={String(comp.weight ?? '')}
                                                            onChange={(e) =>
                                                                handleUpdateComponent(pIdx, cIdx, {
                                                                    weight: Number(e.target.value) || 0
                                                                })
                                                            }
                                                        />
                                                        <span className="absolute right-2 top-2 text-xs text-slate-400 font-bold pointer-events-none">
                                                            %
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
                                                        />
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
