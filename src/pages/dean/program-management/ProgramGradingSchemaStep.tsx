import CommonButton from '@components/button/CommonButton';
import CommonInput from '@components/input/CommonInput';
import {
    ArrowCounterClockwiseIcon,
    CaretDownIcon,
    CheckCircleIcon,
    InfoIcon,
    PlusCircleIcon,
    ScalesIcon,
    TrashIcon
} from '@phosphor-icons/react';
import { ProgramFormValues } from '@type/program/program.type';
import { componentRailColor } from '@utils/period-allocation.util';
import { useState } from 'react';
import { Control, useController, useWatch } from 'react-hook-form';

interface ProgramGradingSchemaStepProps {
    control: Control<ProgramFormValues>;
    disabled?: boolean;
}

export const DEFAULT_ACADEMIC_YEAR_PERIODS = [
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

export default function ProgramGradingSchemaStep({ control, disabled = false }: ProgramGradingSchemaStepProps) {
    const overrideEnabled = useWatch({ control, name: 'override_grading_schema' });
    const { field: overrideField } = useController({ control, name: 'override_grading_schema' });
    const { field: periodsField } = useController({ control, name: 'grading_periods' });
    const [collapsedPeriods, setCollapsedPeriods] = useState<Record<number, boolean>>({});

    function togglePeriodCollapse(index: number) {
        setCollapsedPeriods((prev) => ({ ...prev, [index]: !prev[index] }));
    }

    const activePeriods = overrideEnabled && periodsField.value?.length
        ? periodsField.value
        : DEFAULT_ACADEMIC_YEAR_PERIODS;

    // Default button: resets to inheriting standard institutional default settings
    function handleSetDefault() {
        overrideField.onChange(false);
        periodsField.onChange([]);
    }

    function handleUpdatePeriodWeight(pIndex: number, newWeight: number) {
        if (!overrideEnabled) overrideField.onChange(true);
        const next = JSON.parse(JSON.stringify(activePeriods));
        next[pIndex].weight = newWeight;
        periodsField.onChange(next);
    }

    function handleUpdateComponentWeight(pIndex: number, cIndex: number, newWeight: number) {
        if (!overrideEnabled) overrideField.onChange(true);
        const next = JSON.parse(JSON.stringify(activePeriods));
        if (next[pIndex].components?.[cIndex]) {
            next[pIndex].components[cIndex].weight = newWeight;
        }
        periodsField.onChange(next);
    }

    function handleAddComponent(pIndex: number) {
        if (!overrideEnabled) overrideField.onChange(true);
        const next = JSON.parse(JSON.stringify(activePeriods));
        if (!next[pIndex].components) next[pIndex].components = [];
        next[pIndex].components.push({ name: '', weight: 0 });
        periodsField.onChange(next);
    }

    function handleRemoveComponent(pIndex: number, cIndex: number) {
        if (!overrideEnabled) overrideField.onChange(true);
        const next = JSON.parse(JSON.stringify(activePeriods));
        if (next[pIndex].components.length <= 1) return; // Always keep at least 1 component
        next[pIndex].components.splice(cIndex, 1);
        periodsField.onChange(next);
    }

    function handleAddPeriod() {
        if (!overrideEnabled) overrideField.onChange(true);
        const next = JSON.parse(JSON.stringify(activePeriods));
        const seq = next.length + 1;
        next.push({
            name: '',
            sequence: seq,
            weight: 0,
            components: []
        });
        periodsField.onChange(next);
    }

    function handleRemovePeriod(pIndex: number) {
        if (activePeriods.length <= 1) return; // Always keep at least one schema period
        if (!overrideEnabled) overrideField.onChange(true);
        const next = JSON.parse(JSON.stringify(activePeriods));
        next.splice(pIndex, 1);
        const resequenced = next.map((p: any, idx: number) => ({ ...p, sequence: idx + 1 }));
        periodsField.onChange(resequenced);
    }

    const totalPeriodWeight = activePeriods.reduce((sum, p) => sum + (Number(p.weight) || 0), 0);
    const isTotalValid = totalPeriodWeight === 100;

    return (
        <div className="flex flex-col gap-4 w-full">
            {/* Form Header Block */}
            <div className="flex flex-col gap-3 p-4 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
                {/* Row 1: Title & Description */}
                <div className="flex items-start gap-3">
                    <div className="p-2.5 rounded-xl bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 shrink-0">
                        <ScalesIcon className="w-5 h-5" />
                    </div>
                    <div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                            Grading Schema Configuration
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            {overrideEnabled
                                ? 'Custom grading schema active for this program.'
                                : 'Default: Inheriting standard institutional grading settings.'}
                        </p>
                    </div>
                </div>

                {/* Row 2: Status Card */}
                <div className="w-full">
                    {overrideEnabled
                        ? (
                            <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-800/60 text-xs font-semibold">
                                <InfoIcon className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
                                <span>Program Override Active — Custom grading schema is defined for this program.</span>
                            </div>
                        )
                        : (
                            <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800/60 text-xs font-semibold">
                                <CheckCircleIcon className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                                <span>Inheriting Institutional Defaults — Program uses standard university grading settings.</span>
                            </div>
                        )}
                </div>

                {/* Row 3: Action Buttons */}
                {overrideEnabled && (
                    <div className="flex items-center gap-2 w-full pt-1">
                        <CommonButton
                            disabled={disabled}
                            size="small"
                            startIcon={<ArrowCounterClockwiseIcon className="w-4 h-4" />}
                            variant="outlined"
                            onClick={handleSetDefault}
                        >
                            Default (Inherit)
                        </CommonButton>
                    </div>
                )}

                {/* Row 4: Total Period Weight Banner & Add Period Button */}
                <div
                    className={`flex items-center justify-between px-4 py-2.5 rounded-lg border text-xs font-semibold shrink-0 mt-1 ${
                        isTotalValid
                            ? 'bg-emerald-50/70 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                            : 'bg-amber-50/70 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                    }`}>
                    <div className="flex items-center gap-2">
                        <InfoIcon className="w-4 h-4" />
                        <span>Grading Periods Total: {totalPeriodWeight}% (Must equal 100%)</span>
                    </div>
                    {overrideEnabled && (
                        <button
                            className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline font-bold cursor-pointer"
                            disabled={disabled}
                            type="button"
                            onClick={handleAddPeriod}
                        >
                            <PlusCircleIcon className="w-4 h-4" /> Add Period
                        </button>
                    )}
                </div>
            </div>

            {/* Period Entries */}
            <div className="flex flex-col gap-4 w-full">
                {activePeriods.map((period, pIdx) => {
                    const compTotal = (period.components || []).reduce((sum, c) => sum + (Number(c.weight) || 0), 0);
                    const isCompValid = compTotal === 100;

                    return (
                        <div
                            className="flex flex-col border border-slate-200 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-900 overflow-hidden shadow-sm"
                            key={period.name + pIdx}
                        >
                            <div className="p-3 bg-slate-50 dark:bg-zinc-800/60 border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between">
                                <div className="flex items-center gap-2 min-w-0">
                                    <span className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                                        {period.sequence}. {period.name || `Period ${period.sequence}`}
                                    </span>
                                    <span className="text-[11px] font-semibold text-brand-600 dark:text-brand-400 shrink-0">
                                        ({period.weight}%)
                                    </span>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    <div className="flex items-center gap-1 w-32 sm:w-40">
                                        <CommonInput
                                            disabled={disabled}
                                            size="small"
                                            slotProps={{
                                                htmlInput: {
                                                    className: 'text-right font-semibold text-xs',
                                                    min: 0,
                                                    max: 100
                                                }
                                            }}
                                            type="number"
                                            value={period.weight}
                                            onChange={(e) => handleUpdatePeriodWeight(pIdx, Number(e.target.value))}
                                        />
                                        <span className="text-xs text-slate-500 font-medium">%</span>
                                    </div>
                                    {overrideEnabled && activePeriods.length > 1 && (
                                        <button
                                            className="text-slate-400 hover:text-red-500 p-1 cursor-pointer"
                                            disabled={disabled}
                                            title="Remove Period"
                                            type="button"
                                            onClick={() => handleRemovePeriod(pIdx)}
                                        >
                                            <TrashIcon className="w-4 h-4" />
                                        </button>
                                    )}
                                    <button
                                        className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 font-medium flex items-center gap-1 p-1 rounded-lg hover:bg-slate-200/60 dark:hover:bg-zinc-700/50 transition-colors cursor-pointer"
                                        title={collapsedPeriods[pIdx] ? 'Expand period' : 'Collapse period'}
                                        type="button"
                                        aria-label={collapsedPeriods[pIdx] ? 'Expand period' : 'Collapse period'}
                                        onClick={() => togglePeriodCollapse(pIdx)}
                                    >
                                        <CaretDownIcon
                                            className={`w-4 h-4 transition-transform duration-200 ${collapsedPeriods[pIdx] ? '-rotate-90' : 'rotate-0'}`}
                                            weight="bold"
                                        />
                                        <span className="text-xs hidden sm:inline">{collapsedPeriods[pIdx] ? 'Expand' : 'Collapse'}</span>
                                    </button>
                                </div>
                            </div>

                            <div className={collapsedPeriods[pIdx] ? 'hidden' : 'p-3 flex flex-col gap-3 flex-1'}>
                                <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 border-b border-slate-100 dark:border-zinc-800/60 pb-1.5">
                                    <span>Components</span>
                                    <span
                                        className={isCompValid
                                            ? 'text-emerald-600 dark:text-emerald-400'
                                            : 'text-amber-600 dark:text-amber-400'}>
                                        {compTotal}% / 100%
                                    </span>
                                </div>

                                <div className="flex flex-col gap-2 flex-1">
                                    {(period.components || []).map((comp, cIdx) => (
                                        <div className="flex items-center gap-2 text-xs" key={cIdx}>
                                            <div className={`w-2 h-2 rounded-full ${componentRailColor(cIdx)}`} />
                                            <input
                                                className="flex-1 bg-transparent border-b border-transparent hover:border-slate-300 dark:hover:border-zinc-700 focus:border-blue-500 outline-none text-xs text-slate-700 dark:text-slate-200 font-medium"
                                                disabled={disabled}
                                                placeholder="e.g., Quizzes, Midterm Exam, Recitation"
                                                type="text"
                                                value={comp.name}
                                                onChange={(e) => {
                                                    if (!overrideEnabled) overrideField.onChange(true);
                                                    const next = JSON.parse(JSON.stringify(activePeriods));
                                                    next[pIdx].components[cIdx].name = e.target.value;
                                                    periodsField.onChange(next);
                                                }}
                                            />
                                            <div className="flex items-center gap-1 w-32">
                                                <input
                                                    className="w-full text-right bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded px-1.5 py-0.5 text-xs font-semibold"
                                                    disabled={disabled}
                                                    type="number"
                                                    value={comp.weight}
                                                    onChange={(e) => handleUpdateComponentWeight(pIdx, cIdx, Number(e.target.value))}
                                                />
                                                <span className="text-[10px] text-slate-400">%</span>
                                            </div>
                                            {overrideEnabled && (period.components || []).length > 1 && (
                                                <button
                                                    className="text-slate-400 hover:text-red-500 p-0.5"
                                                    disabled={disabled}
                                                    type="button"
                                                    onClick={() => handleRemoveComponent(pIdx, cIdx)}
                                                >
                                                    <TrashIcon className="w-3.5 h-3.5" />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>

                                {overrideEnabled && (
                                    <button
                                        className="flex items-center justify-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 mt-1 py-1 border border-dashed border-blue-200 dark:border-blue-800 rounded-lg hover:bg-blue-50/50 dark:hover:bg-blue-950/30 transition-colors"
                                        disabled={disabled}
                                        type="button"
                                        onClick={() => handleAddComponent(pIdx)}
                                    >
                                        <PlusCircleIcon className="w-3.5 h-3.5" /> Add Component
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}