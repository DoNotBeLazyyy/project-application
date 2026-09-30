import CommonButton from '@components/button/CommonButton';
import CommonInfoTooltip from '@components/tooltip/CommonInfoTooltip';
import {
    ArrowCounterClockwiseIcon,
    CheckCircleIcon,
    InfoIcon,
    PlusIcon,
    TrashIcon,
    WarningCircleIcon,
    XCircleIcon
} from '@phosphor-icons/react';
import { AcademicYearWizardFormValues, WizardTransmutationRow } from '@type/school-year.type';
import { Control, useFieldArray, useWatch } from 'react-hook-form';
import { DEFAULT_TRANSMUTATION_ROWS, isSpecialGradeRow } from './wizard.constants';

interface Step4TransmutationConfigProps {
    control: Control<AcademicYearWizardFormValues>;
    disabled?: boolean;
}

export default function Step4TransmutationConfig({
    control,
    disabled = false
}: Step4TransmutationConfigProps) {
    const { fields, append, remove, replace, update } = useFieldArray({
        control,
        name: 'transmutation_rows'
    });

    const rows = useWatch({ control, name: 'transmutation_rows' }) || [];

    const passingCount = rows.filter((r) => r.is_passing).length;
    const nonPassingCount = rows.length - passingCount;

    function handleAddRow() {
        const newRow: WizardTransmutationRow = {
            label: '1.00',
            min_percentage: 0,
            max_percentage: 100,
            transmuted_grade: 1.00,
            is_passing: true,
            special_code: null,
            description: ''
        };
        append(newRow);
    }

    function handleLoadPreset() {
        replace([...DEFAULT_TRANSMUTATION_ROWS]);
    }

    function handleUpdatePercentage(
        index: number,
        field: 'min_percentage' | 'max_percentage',
        val: number
    ) {
        const updatedRows = [...rows];
        const currentRow = { ...updatedRows[index], [field]: val };
        updatedRows[index] = currentRow;

        // Skip any special flag rows (DRP, INC) when auto-adjusting adjacent score ladders
        let nextIndex = index + 1;
        while (nextIndex < updatedRows.length && isSpecialGradeRow(updatedRows[nextIndex])) {
            nextIndex++;
        }
        let prevIndex = index - 1;
        while (prevIndex >= 0 && isSpecialGradeRow(updatedRows[prevIndex])) {
            prevIndex--;
        }

        const nextRow = nextIndex < updatedRows.length ? updatedRows[nextIndex] : null;
        const prevRow = prevIndex >= 0 ? updatedRows[prevIndex] : null;

        if (field === 'max_percentage') {
            if (nextRow && nextRow.min_percentage !== null && nextRow.min_percentage !== undefined) {
                const currentMin = Number(currentRow.min_percentage) || 0;
                const nextMin = Number(nextRow.min_percentage) || 0;
                const isAscending = nextMin >= currentMin;
                if (isAscending) {
                    const step = (val % 1 !== 0 || nextMin % 1 !== 0) ? 0.5 : 1;
                    const newNextMin = Math.min(100, Math.max(0, val + step));
                    const newNextMax = Math.max(newNextMin, Number(nextRow.max_percentage) || newNextMin);
                    updatedRows[nextIndex] = {
                        ...nextRow,
                        max_percentage: newNextMax,
                        min_percentage: newNextMin
                    };
                }
            }
            if (prevRow && prevRow.min_percentage !== null && prevRow.min_percentage !== undefined) {
                const prevMin = Number(prevRow.min_percentage) || 0;
                if (val >= prevMin && prevMin > 0) {
                    const step = (val % 1 !== 0 || prevMin % 1 !== 0) ? 0.5 : 1;
                    currentRow.max_percentage = Math.max(0, prevMin - step);
                }
            }
        } else if (field === 'min_percentage') {
            if (nextRow && nextRow.max_percentage !== null && nextRow.max_percentage !== undefined) {
                const nextMax = Number(nextRow.max_percentage) || 0;
                if (val <= nextMax) {
                    const step = (val % 1 !== 0 || nextMax % 1 !== 0) ? 0.5 : 1;
                    const newNextMax = Math.max(0, Math.min(100, val - step));
                    const newNextMin = Math.min(newNextMax, Number(nextRow.min_percentage) || 0);
                    updatedRows[nextIndex] = {
                        ...nextRow,
                        max_percentage: newNextMax,
                        min_percentage: newNextMin
                    };
                }
            }
            if (prevRow && prevRow.max_percentage !== null && prevRow.max_percentage !== undefined) {
                const prevMax = Number(prevRow.max_percentage) || 0;
                if (val <= prevMax) {
                    const step = (val % 1 !== 0 || prevMax % 1 !== 0) ? 0.5 : 1;
                    const prevMin = Number(prevRow.min_percentage) || 0;
                    updatedRows[prevIndex] = {
                        ...prevRow,
                        max_percentage: Math.max(prevMin, val - step)
                    };
                }
            }
        }

        replace(updatedRows);
    }

    return (
        <div className="flex flex-col gap-6">
            {/* Header info */}
            <div className="flex items-start gap-3 p-4 rounded-xl bg-slate-50 dark:bg-zinc-800/40 border border-slate-200 dark:border-zinc-800 text-sm">
                <InfoIcon className="w-5 h-5 text-brand-600 shrink-0 mt-0.5" />
                <div className="space-y-1 text-slate-700 dark:text-slate-300">
                    <p className="font-semibold text-slate-900 dark:text-slate-100">
                        Academic Year Transmutation Schema & Passing Marks
                    </p>
                    <p className="text-xs sm:text-sm">
                        Define how computed raw grade percentages map to official transmuted marks (e.g. 1.00, 1.21, 3.00, 5.00) or special marks (INC, DRP). Your institution completely controls which grades are considered passing or failing.
                    </p>
                </div>
            </div>

            {/* Top Toolbar / Summary Badges */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-white dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700/60 shadow-sm">
                <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-slate-100 dark:bg-zinc-700 text-slate-800 dark:text-slate-200">
                        Total Rungs: {rows.length}
                    </span>
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                        <CheckCircleIcon className="w-3.5 h-3.5" />
                        Passing: {passingCount}
                    </span>
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-800 flex items-center gap-1">
                        <XCircleIcon className="w-3.5 h-3.5" />
                        Failing / Special: {nonPassingCount}
                    </span>
                </div>

                {!disabled && (
                    <div className="flex items-center gap-2 shrink-0">
                        <CommonButton
                            color="inherit"
                            size="small"
                            startIcon={<ArrowCounterClockwiseIcon className="w-3.5 h-3.5" />}
                            variant="outlined"
                            onClick={handleLoadPreset}
                        >
                            Reset to Default
                        </CommonButton>
                        <CommonButton
                            color="primary"
                            size="small"
                            startIcon={<PlusIcon className="w-3.5 h-3.5" />}
                            variant="contained"
                            onClick={handleAddRow}
                        >
                            Add Grade Row
                        </CommonButton>
                    </div>
                )}
            </div>

            {/* Empty State */}
            {rows.length === 0 && (
                <div className="p-8 text-center border-2 border-dashed border-slate-200 dark:border-zinc-800 rounded-2xl space-y-3">
                    <WarningCircleIcon className="w-10 h-10 text-amber-500 mx-auto" />
                    <p className="font-semibold text-slate-800 dark:text-slate-200">
                        No Transmutation Ladder Defined
                    </p>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto">
                        Without a transmutation table, raw scores cannot be converted into official transcript marks.
                    </p>
                    {!disabled && (
                        <div className="pt-2 flex justify-center gap-2">
                            <CommonButton
                                color="primary"
                                size="small"
                                variant="contained"
                                onClick={handleLoadPreset}
                            >
                                Load Standard 1.00–5.00 Ladder
                            </CommonButton>
                        </div>
                    )}
                </div>
            )}

            {/* Desktop Table View (>= 768px) */}
            <div className="hidden md:block overflow-x-auto rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 shadow-sm">
                <table className="w-full text-left text-xs sm:text-sm">
                    <thead className="bg-slate-50 dark:bg-zinc-700/50 border-b border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-slate-300 font-semibold">
                        <tr>
                            <th className="py-3 px-3 w-32">
                                <div className="flex items-center gap-1">
                                    <span>Type</span>
                                    <CommonInfoTooltip content="Choose whether this mark is a Fixed score range or a Conditional status grade (INC, DRP)." size={13} />
                                </div>
                            </th>
                            <th className="py-3 px-4 w-28">
                                <div className="flex items-center gap-1">
                                    <span>Mark / Grade <span className="text-red-500">*</span></span>
                                    <CommonInfoTooltip content="Transmuted numeric mark (e.g. 1.00, 1.25, 3.00, 5.00) or status mark (INC, DRP)." size={13} />
                                </div>
                            </th>
                            <th className="py-3 px-3 w-24">
                                <div className="flex items-center gap-1">
                                    <span>Min %</span>
                                    <CommonInfoTooltip content="Minimum raw percentage required for this fixed grade mark." size={13} />
                                </div>
                            </th>
                            <th className="py-3 px-3 w-24">
                                <div className="flex items-center gap-1">
                                    <span>Max %</span>
                                    <CommonInfoTooltip content="Maximum raw percentage allocated to this fixed grade mark." size={13} />
                                </div>
                            </th>
                            <th className="py-3 px-4 w-32 text-center">
                                <div className="flex items-center justify-center gap-1">
                                    <span>Status</span>
                                    <CommonInfoTooltip content="Toggles whether this grade mark grants academic credit (Passing vs Failing)." size={13} />
                                </div>
                            </th>
                            <th className="py-3 px-4">
                                <div className="flex items-center gap-1">
                                    <span>Description</span>
                                    <CommonInfoTooltip content="Human-readable descriptor appearing on report cards and evaluation transcripts." size={13} />
                                </div>
                            </th>
                            {!disabled && <th className="py-3 px-3 w-16 text-center">Action</th>}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-zinc-700/60">
                        {fields.map((field, index) => {
                            const row = rows[index] || field;
                            const isCond = Boolean(row.is_conditional || isSpecialGradeRow(row));

                            return (
                                <tr
                                    key={field.id}
                                    className="hover:bg-slate-50/70 dark:hover:bg-zinc-700/30 transition-colors"
                                >
                                    {/* Grade Type Selector */}
                                    <td className="py-2.5 px-3">
                                        <select
                                            className="w-full px-2 py-1 text-xs font-semibold rounded border border-slate-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-slate-900 dark:text-slate-100 focus:ring-1 focus:ring-brand-500 disabled:opacity-50"
                                            disabled={disabled}
                                            value={isCond ? 'conditional' : 'fixed'}
                                            onChange={(e) => {
                                                const nextCond = e.target.value === 'conditional';
                                                const numeric = parseFloat(row.label);
                                                update(index, {
                                                    ...row,
                                                    is_conditional: nextCond,
                                                    min_percentage: nextCond ? null : (row.min_percentage ?? 0),
                                                    max_percentage: nextCond ? null : (row.max_percentage ?? 100),
                                                    transmuted_grade: nextCond ? null : (isNaN(numeric) ? null : numeric),
                                                    special_code: nextCond ? row.label.trim().toUpperCase() : null
                                                });
                                            }}
                                        >
                                            <option value="fixed">Fixed Range</option>
                                            <option value="conditional">Conditional</option>
                                        </select>
                                    </td>

                                    {/* Grade Mark / Label */}
                                    <td className="py-2.5 px-4 font-semibold">
                                        <input
                                            className="w-full px-2.5 py-1 text-sm rounded border border-slate-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-slate-900 dark:text-slate-100 font-bold focus:ring-1 focus:ring-brand-500 disabled:opacity-50"
                                            disabled={disabled}
                                            placeholder="e.g. 1.25, INC"
                                            type="text"
                                            value={row.label}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                const numeric = parseFloat(val);
                                                update(index, {
                                                    ...row,
                                                    label: val,
                                                    transmuted_grade: isCond ? null : (isNaN(numeric) ? null : numeric),
                                                    special_code: isCond ? val.trim().toUpperCase() : null
                                                });
                                            }}
                                        />
                                    </td>

                                    {/* Min % */}
                                    <td className="py-2.5 px-3">
                                        {isCond ? (
                                            <span className="inline-flex items-center justify-center w-full px-2 py-1 text-xs font-medium text-slate-400 select-none">
                                                —
                                            </span>
                                        ) : (
                                            <input
                                                className="w-full px-2 py-1 text-sm text-right rounded border border-slate-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-slate-900 dark:text-slate-100 focus:ring-1 focus:ring-brand-500 disabled:opacity-50"
                                                disabled={disabled}
                                                max={100}
                                                min={0}
                                                step={0.5}
                                                type="number"
                                                value={row.min_percentage ?? ''}
                                                onChange={(e) => handleUpdatePercentage(index, 'min_percentage', Number(e.target.value) || 0)}
                                            />
                                        )}
                                    </td>

                                    {/* Max % */}
                                    <td className="py-2.5 px-3">
                                        {isCond ? (
                                            <span className="inline-flex items-center justify-center w-full px-2 py-1 text-xs font-medium text-slate-400 select-none">
                                                —
                                            </span>
                                        ) : (
                                            <input
                                                className="w-full px-2 py-1 text-sm text-right rounded border border-slate-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-slate-900 dark:text-slate-100 focus:ring-1 focus:ring-brand-500 disabled:opacity-50"
                                                disabled={disabled}
                                                max={100}
                                                min={0}
                                                step={0.5}
                                                type="number"
                                                value={row.max_percentage ?? ''}
                                                onChange={(e) => handleUpdatePercentage(index, 'max_percentage', Number(e.target.value) || 0)}
                                            />
                                        )}
                                    </td>

                                    {/* Passing / Failing toggle */}
                                    <td className="py-2.5 px-4 text-center">
                                        <button
                                            className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                                                row.is_passing
                                                    ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300'
                                                    : 'bg-rose-100 text-rose-800 hover:bg-rose-200 dark:bg-rose-950/60 dark:text-rose-300'
                                            } disabled:opacity-60`}
                                            disabled={disabled}
                                            type="button"
                                            onClick={() => update(index, { ...row, is_passing: !row.is_passing })}
                                        >
                                            {row.is_passing ? '✓ Passing' : '✕ Failing'}
                                        </button>
                                    </td>

                                    {/* Description */}
                                    <td className="py-2.5 px-4">
                                        <input
                                            className="w-full px-2.5 py-1 text-xs sm:text-sm rounded border border-slate-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-slate-900 dark:text-slate-100 focus:ring-1 focus:ring-brand-500 disabled:opacity-50"
                                            disabled={disabled}
                                            placeholder="e.g. Excellent, Incomplete, Dropped"
                                            type="text"
                                            value={row.description || ''}
                                            onChange={(e) => update(index, { ...row, description: e.target.value })}
                                        />
                                    </td>

                                    {/* Action */}
                                    {!disabled && (
                                        <td className="py-2.5 px-3 text-center">
                                            <button
                                                className="p-1.5 text-slate-400 hover:text-red-600 rounded-md hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                                                title="Delete row"
                                                type="button"
                                                onClick={() => remove(index)}
                                            >
                                                <TrashIcon className="w-4 h-4" />
                                            </button>
                                        </td>
                                    )}
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Mobile Touch Cards (< 768px) */}
            <div className="block md:hidden space-y-3">
                {fields.map((field, index) => {
                    const row = rows[index] || field;
                    const isCond = Boolean(row.is_conditional || isSpecialGradeRow(row));

                    return (
                        <div
                            key={field.id}
                            className="p-4 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 shadow-sm space-y-3"
                        >
                            {/* Card Top: Mark, Type Selector, Passing Pill, Delete */}
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-slate-400 font-semibold">#{index + 1}</span>
                                    <input
                                        className="w-20 px-2 py-1 text-sm font-bold rounded-lg border border-slate-300 dark:border-zinc-600 bg-slate-50 dark:bg-zinc-900 text-slate-900 dark:text-slate-100 focus:ring-1 focus:ring-brand-500 disabled:opacity-50"
                                        disabled={disabled}
                                        placeholder="Mark"
                                        type="text"
                                        value={row.label}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            const numeric = parseFloat(val);
                                            update(index, {
                                                ...row,
                                                label: val,
                                                transmuted_grade: isCond ? null : (isNaN(numeric) ? null : numeric),
                                                special_code: isCond ? val.trim().toUpperCase() : null
                                            });
                                        }}
                                    />
                                    <select
                                        className="px-2 py-1 text-xs font-semibold rounded-lg border border-slate-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-slate-900 dark:text-slate-100 focus:ring-1 focus:ring-brand-500 disabled:opacity-50"
                                        disabled={disabled}
                                        value={isCond ? 'conditional' : 'fixed'}
                                        onChange={(e) => {
                                            const nextCond = e.target.value === 'conditional';
                                            const numeric = parseFloat(row.label);
                                            update(index, {
                                                ...row,
                                                is_conditional: nextCond,
                                                min_percentage: nextCond ? null : (row.min_percentage ?? 0),
                                                max_percentage: nextCond ? null : (row.max_percentage ?? 100),
                                                transmuted_grade: nextCond ? null : (isNaN(numeric) ? null : numeric),
                                                special_code: nextCond ? row.label.trim().toUpperCase() : null
                                            });
                                        }}
                                    >
                                        <option value="fixed">Fixed</option>
                                        <option value="conditional">Conditional</option>
                                    </select>
                                </div>

                                <div className="flex items-center gap-2">
                                    <button
                                        className={`px-2.5 py-1 min-h-[32px] rounded-full text-xs font-bold transition-all ${
                                            row.is_passing
                                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                                                : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                                        } disabled:opacity-60`}
                                        disabled={disabled}
                                        type="button"
                                        onClick={() => update(index, { ...row, is_passing: !row.is_passing })}
                                    >
                                        {row.is_passing ? '✓ Passing' : '✕ Failing'}
                                    </button>

                                    {!disabled && (
                                        <button
                                            className="p-1.5 min-h-[32px] min-w-[32px] flex items-center justify-center text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20"
                                            type="button"
                                            onClick={() => remove(index)}
                                        >
                                            <TrashIcon className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Card Middle: Min % & Max % (ONLY if Fixed Range) */}
                            {!isCond && (
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="block text-[11px] text-slate-500 font-medium mb-0.5">
                                            Min % <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            className="w-full px-2.5 py-1.5 text-sm rounded-lg border border-slate-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-slate-900 dark:text-slate-100 focus:ring-1 focus:ring-brand-500 disabled:opacity-50"
                                            disabled={disabled}
                                            max={100}
                                            min={0}
                                            type="number"
                                            value={row.min_percentage ?? ''}
                                            onChange={(e) => handleUpdatePercentage(index, 'min_percentage', Number(e.target.value) || 0)}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] text-slate-500 font-medium mb-0.5">
                                            Max % <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            className="w-full px-2.5 py-1.5 text-sm rounded-lg border border-slate-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-slate-900 dark:text-slate-100 focus:ring-1 focus:ring-brand-500 disabled:opacity-50"
                                            disabled={disabled}
                                            max={100}
                                            min={0}
                                            type="number"
                                            value={row.max_percentage ?? ''}
                                            onChange={(e) => handleUpdatePercentage(index, 'max_percentage', Number(e.target.value) || 0)}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Card Bottom: Description */}
                            <div>
                                <label className="block text-[11px] text-slate-500 font-medium mb-0.5">
                                    Description
                                </label>
                                <input
                                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-slate-900 dark:text-slate-100 focus:ring-1 focus:ring-brand-500 disabled:opacity-50"
                                    disabled={disabled}
                                    placeholder="e.g. Excellent, Incomplete, Dropped"
                                    type="text"
                                    value={row.description || ''}
                                    onChange={(e) => update(index, { ...row, description: e.target.value })}
                                />
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
