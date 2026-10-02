import CommonButton from '@components/button/CommonButton';
import CommonInput from '@components/input/CommonInput';
import CommonNumberInput from '@components/input/CommonNumberInput';
import DeletePromptModal from '@components/modal/DeletePromptModal';
import CommonInfoTooltip from '@components/tooltip/CommonInfoTooltip';
import {
    ArrowCounterClockwiseIcon,
    CheckCircleIcon,
    PlusIcon,
    TrashIcon,
    WarningCircleIcon,
    XCircleIcon
} from '@phosphor-icons/react';
import { AcademicYearWizardFormValues, WizardTransmutationRow } from '@type/school-year.type';
import { useState } from 'react';
import { Control, useFieldArray, UseFormSetValue, useWatch } from 'react-hook-form';
import {
    DEFAULT_TRANSMUTATION_ROWS,
    isSpecialGradeRow,
    PASS_FAIL_PRESET,
    US_GPA_PRESET
} from './wizard.constants';

interface Step4TransmutationConfigProps {
    control: Control<AcademicYearWizardFormValues>;
    disabled?: boolean;
    setValue: UseFormSetValue<AcademicYearWizardFormValues>;
}

export default function Step4TransmutationConfig({
    control,
    disabled = false,
    setValue
}: Step4TransmutationConfigProps) {
    const [deleteRungTarget, setDeleteRungTarget] = useState<{ index: number; label: string } | null>(null);
    const { fields, append, remove, replace } = useFieldArray({
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
            is_conditional: false, // Default is Fixed
            special_code: null,
            description: ''
        };
        append(newRow);
    }

    function handleResetBlank() {
        replace([]);
    }

    function handleLoadPreset() {
        replace([...DEFAULT_TRANSMUTATION_ROWS]);
    }

    function handleResetRowBlank(index: number) {
        setValue(`transmutation_rows.${index}.description`, '', { shouldDirty: true });
        setValue(`transmutation_rows.${index}.label`, '', { shouldDirty: true });
        setValue(`transmutation_rows.${index}.max_percentage`, null, { shouldDirty: true });
        setValue(`transmutation_rows.${index}.min_percentage`, null, { shouldDirty: true });
        setValue(`transmutation_rows.${index}.transmuted_grade`, null, { shouldDirty: true });
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

        setValue('transmutation_rows', updatedRows, { shouldDirty: true });
    }

    return (
        <div className="flex flex-col gap-6">
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
                    <div className="flex flex-wrap items-center gap-2 shrink-0 w-full sm:w-auto">
                        <select
                            aria-label="Preset Transmutation Schema"
                            className="h-8 px-2.5 text-xs font-semibold rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-500 cursor-pointer w-full sm:w-auto"
                            value=""
                            onChange={(e) => {
                                if (e.target.value === 'ched') replace([...DEFAULT_TRANSMUTATION_ROWS]);
                                if (e.target.value === 'us_gpa') replace([...US_GPA_PRESET]);
                                if (e.target.value === 'pass_fail') replace([...PASS_FAIL_PRESET]);
                            }}
                        >
                            <option value="">-- Apply Preset Schema --</option>
                            <option value="ched">CHED Standard (1.00 – 5.00 Scale)</option>
                            <option value="us_gpa">US Letter Grade (A, B, C, D, F Scale)</option>
                            <option value="pass_fail">Pass / Fail Direct Scale</option>
                        </select>

                        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                            <CommonButton
                                color="primary"
                                size="small"
                                className="min-w-0 [&_.MuiButton-startIcon]:mr-0 sm:[&_.MuiButton-startIcon]:mr-2 px-2.5 sm:px-3 !bg-white dark:!bg-zinc-900 border-blue-600 text-blue-600 hover:!bg-blue-50 dark:border-blue-500 dark:text-blue-400 dark:hover:!bg-blue-950/40"
                                startIcon={<ArrowCounterClockwiseIcon className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />}
                                variant="outlined"
                                onClick={handleResetBlank}
                                title="Reset to Blank"
                            >
                                <span className="hidden sm:inline">Reset to Blank</span>
                            </CommonButton>
                            <CommonButton
                                color="primary"
                                size="small"
                                className="min-w-0 [&_.MuiButton-startIcon]:mr-0 sm:[&_.MuiButton-startIcon]:mr-2 px-2.5 sm:px-3"
                                startIcon={<PlusIcon className="w-3.5 h-3.5" />}
                                variant="contained"
                                onClick={handleAddRow}
                                title="Add Grade Row"
                            >
                                <span className="hidden sm:inline">Add Grade Row</span>
                            </CommonButton>
                        </div>
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

            {/* Grade Rung Cards List */}
            <div className="space-y-4">
                {fields.map((field, index) => {
                    const row = rows[index] || field;
                    const isCond = Boolean(row.is_conditional || isSpecialGradeRow(row));

                    return (
                        <div
                            key={field.id}
                            className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-zinc-800/90 border border-slate-200 dark:border-zinc-700/60 shadow-xs space-y-4 transition-all"
                        >
                            {/* Row 1: Header with Action Buttons */}
                            <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-700/50 pb-3">
                                <span className="w-6 h-6 rounded-md bg-slate-200 dark:bg-zinc-700 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center justify-center shrink-0">
                                    #{index + 1}
                                </span>

                                {!disabled && (
                                    <div className="flex items-center gap-1.5">
                                        <CommonButton
                                            color="inherit"
                                            size="small"
                                            className="min-w-0 [&_.MuiButton-startIcon]:mr-0 sm:[&_.MuiButton-startIcon]:mr-2 px-2 sm:px-2.5"
                                            startIcon={<ArrowCounterClockwiseIcon className="w-3.5 h-3.5" />}
                                            variant="outlined"
                                            onClick={() => handleResetRowBlank(index)}
                                            title="Reset grade rung fields to blank"
                                        >
                                            <span className="hidden sm:inline">Clear</span>
                                        </CommonButton>
                                        <CommonButton
                                            color="error"
                                            size="small"
                                            className="min-w-0 [&_.MuiButton-startIcon]:mr-0 sm:[&_.MuiButton-startIcon]:mr-2 px-2 sm:px-2.5"
                                            startIcon={<TrashIcon className="w-3.5 h-3.5" />}
                                            variant="outlined"
                                            onClick={() => {
                                                setDeleteRungTarget({
                                                    index,
                                                    label: row.label || `Grade Rung #${index + 1}`
                                                });
                                            }}
                                            title="Delete grade rung"
                                        >
                                            <span className="hidden sm:inline">Delete</span>
                                        </CommonButton>
                                    </div>
                                )}
                            </div>

                            {/* Row 2: Type, Description, and Status */}
                            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                                {/* Type Selector */}
                                <div className="sm:col-span-4 md:col-span-3">
                                    <label className="flex items-center gap-1 text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                                        <span>Grade Type</span>
                                        <CommonInfoTooltip content="Choose whether this mark is a Fixed score range or a Conditional status grade (INC, DRP)." size={13} />
                                    </label>
                                    <select
                                        className="w-full h-9 px-3 text-xs font-semibold rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:border-none disabled:bg-transparent disabled:appearance-none disabled:p-0 disabled:font-medium cursor-pointer"
                                        disabled={disabled}
                                        value={isCond ? 'conditional' : 'fixed'}
                                        onChange={(e) => {
                                            const nextCond = e.target.value === 'conditional';
                                            const numeric = parseFloat(row.label);
                                            setValue(`transmutation_rows.${index}.is_conditional`, nextCond, { shouldDirty: true });
                                            setValue(`transmutation_rows.${index}.min_percentage`, nextCond ? null : (row.min_percentage ?? 0), { shouldDirty: true });
                                            setValue(`transmutation_rows.${index}.max_percentage`, nextCond ? null : (row.max_percentage ?? 100), { shouldDirty: true });
                                            setValue(`transmutation_rows.${index}.transmuted_grade`, nextCond ? null : (isNaN(numeric) ? null : numeric), { shouldDirty: true });
                                            setValue(`transmutation_rows.${index}.special_code`, nextCond ? row.label.trim().toUpperCase() : null, { shouldDirty: true });
                                        }}
                                    >
                                        <option value="fixed">Fixed Range</option>
                                        <option value="conditional">Conditional</option>
                                    </select>
                                </div>

                                {/* Description */}
                                <div className="sm:col-span-5 md:col-span-6">
                                    <CommonInput
                                        description="Human-readable descriptor appearing on report cards and evaluation transcripts."
                                        disabled={disabled}
                                        fullWidth
                                        label="Description"
                                        placeholder="e.g. Excellent, Incomplete, Dropped"
                                        size="small"
                                        value={row.description || ''}
                                        onChange={(e) => setValue(`transmutation_rows.${index}.description`, e.target.value, { shouldDirty: true })}
                                    />
                                </div>

                                {/* Academic Status Toggle */}
                                <div className="sm:col-span-3">
                                    <label className="flex items-center gap-1 text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                                        <span>Status</span>
                                        <CommonInfoTooltip content="Toggles whether this grade mark grants academic credit (Passing vs Failing)." size={13} />
                                    </label>
                                    <button
                                        className={`w-full h-9 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                                            row.is_passing
                                                ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                                                : 'bg-rose-100 text-rose-800 hover:bg-rose-200 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-300 dark:border-rose-800'
                                        } disabled:opacity-60`}
                                        disabled={disabled}
                                        type="button"
                                        onClick={() => setValue(`transmutation_rows.${index}.is_passing`, !row.is_passing, { shouldDirty: true })}
                                    >
                                        {row.is_passing ? '✓ Passing' : '✕ Failing'}
                                    </button>
                                </div>
                            </div>

                            {/* Row 3: Mark, Min and Max (when Fixed Range) vs Mark only (when Conditional) */}
                            {isCond ? (
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    <div>
                                        <CommonInput
                                            description="Status grade code (e.g. INC, DRP, W, NFE)."
                                            disabled={disabled}
                                            fullWidth
                                            isRequired
                                            label="Mark / Grade"
                                            placeholder="e.g. INC, DRP"
                                            size="small"
                                            value={row.label}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                setValue(`transmutation_rows.${index}.label`, val, { shouldDirty: true });
                                                setValue(`transmutation_rows.${index}.transmuted_grade`, null, { shouldDirty: true });
                                                setValue(`transmutation_rows.${index}.special_code`, val.trim().toUpperCase(), { shouldDirty: true });
                                            }}
                                        />
                                    </div>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    {/* Mark / Grade */}
                                    <div>
                                        <CommonInput
                                            description="Transmuted numeric mark (e.g. 1.00, 1.25, 3.00, 5.00)."
                                            disabled={disabled}
                                            fullWidth
                                            isRequired
                                            label="Mark / Grade"
                                            placeholder="e.g. 1.25, 3.00"
                                            size="small"
                                            value={row.label}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                const numeric = parseFloat(val);
                                                setValue(`transmutation_rows.${index}.label`, val, { shouldDirty: true });
                                                setValue(`transmutation_rows.${index}.transmuted_grade`, isNaN(numeric) ? null : numeric, { shouldDirty: true });
                                                setValue(`transmutation_rows.${index}.special_code`, null, { shouldDirty: true });
                                            }}
                                        />
                                    </div>

                                    {/* Min % */}
                                    <div>
                                        <CommonNumberInput
                                            description="Minimum raw percentage required for this fixed grade mark."
                                            disabled={disabled}
                                            fullWidth
                                            isRequired
                                            label="Min %"
                                            max={100}
                                            min={0}
                                            size="small"
                                            step={0.5}
                                            suffixText="%"
                                            value={row.min_percentage ?? ''}
                                            onChange={(val) => handleUpdatePercentage(index, 'min_percentage', val ?? 0)}
                                        />
                                    </div>

                                    {/* Max % */}
                                    <div>
                                        <CommonNumberInput
                                            description="Maximum raw percentage allocated to this fixed grade mark."
                                            disabled={disabled}
                                            fullWidth
                                            isRequired
                                            label="Max %"
                                            max={100}
                                            min={0}
                                            size="small"
                                            step={0.5}
                                            suffixText="%"
                                            value={row.max_percentage ?? ''}
                                            onChange={(val) => handleUpdatePercentage(index, 'max_percentage', val ?? 0)}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Delete Grade Rung Prompt Modal */}
            <DeletePromptModal
                isOpen={Boolean(deleteRungTarget)}
                mainContent={{
                    title: 'Delete Grade Rung?'
                }}
                subContent={{
                    title: `Are you sure you want to delete grade rung "${deleteRungTarget?.label}"?`
                }}
                open={Boolean(deleteRungTarget)}
                onClose={() => setDeleteRungTarget(null)}
                formButtonsProps={{
                    confirmProps: {
                        onClick: () => {
                            if (deleteRungTarget !== null) {
                                remove(deleteRungTarget.index);
                                setDeleteRungTarget(null);
                            }
                        }
                    }
                }}
            />
        </div>
    );
}
