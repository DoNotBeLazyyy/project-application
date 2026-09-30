import CommonButton from '@components/button/CommonButton';
import CommonInput from '@components/input/CommonInput';
import {
    ArrowCounterClockwiseIcon,
    CheckCircleIcon,
    InfoIcon,
    PlusCircleIcon,
    ScalesIcon,
    TrashIcon,
    XCircleIcon
} from '@phosphor-icons/react';
import { ProgramFormValues } from '@type/program/program.type';
import { componentRailColor } from '@utils/period-allocation.util';
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

    const activePeriods = overrideEnabled && periodsField.value?.length
        ? periodsField.value
        : DEFAULT_ACADEMIC_YEAR_PERIODS;

    function handleSetDefault() {
        overrideField.onChange(true);
        periodsField.onChange(JSON.parse(JSON.stringify(DEFAULT_ACADEMIC_YEAR_PERIODS)));
    }

    function handleClear() {
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
        next[pIndex].components.push({ name: 'New Component', weight: 0 });
        periodsField.onChange(next);
    }

    function handleRemoveComponent(pIndex: number, cIndex: number) {
        if (!overrideEnabled) overrideField.onChange(true);
        const next = JSON.parse(JSON.stringify(activePeriods));
        next[pIndex].components.splice(cIndex, 1);
        periodsField.onChange(next);
    }

    const totalPeriodWeight = activePeriods.reduce((sum, p) => sum + (Number(p.weight) || 0), 0);
    const isTotalValid = totalPeriodWeight === 100;

    return (
        <div className="flex flex-col gap-5">
            {/* Header & Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60">
                <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
                        <ScalesIcon className="w-5 h-5" />
                    </div>
                    <div>
                        <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                            Grading Schema Configuration
                            {overrideEnabled ? (
                                <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                                    Program Override Active
                                </span>
                            ) : (
                                <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                    <CheckCircleIcon className="w-3.5 h-3.5" /> Inheriting Academic Year Defaults
                                </span>
                            )}
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            {overrideEnabled
                                ? 'Custom grading schema applied to this program.'
                                : 'Currently inheriting standard default settings from Academic Year policy.'}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <CommonButton
                        disabled={disabled}
                        size="small"
                        variant="outlined"
                        onClick={handleSetDefault}
                        startIcon={<ArrowCounterClockwiseIcon className="w-4 h-4" />}
                    >
                        Default
                    </CommonButton>
                    <CommonButton
                        disabled={disabled || !overrideEnabled}
                        size="small"
                        variant="outlined"
                        color="error"
                        onClick={handleClear}
                        startIcon={<XCircleIcon className="w-4 h-4" />}
                    >
                        Clear
                    </CommonButton>
                </div>
            </div>

            {/* Total Period Weight Banner */}
            <div className={`flex items-center justify-between px-4 py-2.5 rounded-lg border text-xs font-semibold ${
                isTotalValid
                    ? 'bg-emerald-50/70 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                    : 'bg-amber-50/70 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
            }`}>
                <div className="flex items-center gap-2">
                    <InfoIcon className="w-4 h-4" />
                    <span>Grading Periods Total: {totalPeriodWeight}% (Must equal 100%)</span>
                </div>
                {!isTotalValid && <span>Adjust weights to total 100%</span>}
            </div>

            {/* Period Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {activePeriods.map((period, pIdx) => {
                    const compTotal = (period.components || []).reduce((sum, c) => sum + (Number(c.weight) || 0), 0);
                    const isCompValid = compTotal === 100;

                    return (
                        <div
                            key={period.name + pIdx}
                            className="flex flex-col border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 overflow-hidden shadow-sm"
                        >
                            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                                <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                                    {period.sequence}. {period.name}
                                </span>
                                <div className="flex items-center gap-1.5 w-24">
                                    <CommonInput
                                        disabled={disabled}
                                        size="small"
                                        type="number"
                                        value={period.weight}
                                        onChange={(e) => handleUpdatePeriodWeight(pIdx, Number(e.target.value))}
                                        slotProps={{
                                            htmlInput: {
                                                className: 'text-right font-semibold text-xs',
                                                min: 0,
                                                max: 100
                                            }
                                        }}
                                    />
                                    <span className="text-xs text-slate-500 font-medium">%</span>
                                </div>
                            </div>

                            <div className="p-3 flex flex-col gap-3 flex-1">
                                <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 border-b border-slate-100 dark:border-slate-800/60 pb-1.5">
                                    <span>Components</span>
                                    <span className={isCompValid ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}>
                                        {compTotal}% / 100%
                                    </span>
                                </div>

                                <div className="flex flex-col gap-2 flex-1">
                                    {(period.components || []).map((comp, cIdx) => (
                                        <div key={cIdx} className="flex items-center gap-2 text-xs">
                                            <div className={`w-2 h-2 rounded-full ${componentRailColor(cIdx)}`} />
                                            <input
                                                type="text"
                                                disabled={disabled}
                                                value={comp.name}
                                                onChange={(e) => {
                                                    if (!overrideEnabled) overrideField.onChange(true);
                                                    const next = JSON.parse(JSON.stringify(activePeriods));
                                                    next[pIdx].components[cIdx].name = e.target.value;
                                                    periodsField.onChange(next);
                                                }}
                                                className="flex-1 bg-transparent border-b border-transparent hover:border-slate-300 dark:hover:border-slate-700 focus:border-blue-500 outline-none text-xs text-slate-700 dark:text-slate-200 font-medium"
                                            />
                                            <div className="flex items-center gap-1 w-16">
                                                <input
                                                    type="number"
                                                    disabled={disabled}
                                                    value={comp.weight}
                                                    onChange={(e) => handleUpdateComponentWeight(pIdx, cIdx, Number(e.target.value))}
                                                    className="w-full text-right bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-1.5 py-0.5 text-xs font-semibold"
                                                />
                                                <span className="text-[10px] text-slate-400">%</span>
                                            </div>
                                            {overrideEnabled && (
                                                <button
                                                    type="button"
                                                    disabled={disabled}
                                                    onClick={() => handleRemoveComponent(pIdx, cIdx)}
                                                    className="text-slate-400 hover:text-red-500 p-0.5"
                                                >
                                                    <TrashIcon className="w-3.5 h-3.5" />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>

                                {overrideEnabled && (
                                    <button
                                        type="button"
                                        disabled={disabled}
                                        onClick={() => handleAddComponent(pIdx)}
                                        className="flex items-center justify-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 mt-1 py-1 border border-dashed border-blue-200 dark:border-blue-800 rounded-lg hover:bg-blue-50/50 dark:hover:bg-blue-950/30 transition-colors"
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
