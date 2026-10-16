import CommonButton from '@components/button/CommonButton';
import FormLabel from '@components/form/FormLabel';
import CommonInput from '@components/input/CommonInput';
import CommonNumberInput from '@components/input/CommonNumberInput';
import DeletePromptModal from '@components/modal/DeletePromptModal';
import CommonSelect from '@components/select/CommonSelect';
import CommonInfoTooltip from '@components/tooltip/CommonInfoTooltip';
import {
    CaretDownIcon,
    CheckCircleIcon,
    PlusIcon,
    TrashIcon,
    WarningCircleIcon,
    XCircleIcon
} from '@phosphor-icons/react';
import { AcademicYearWizardFormValues, WizardTransmutationRow } from '@type/school-year.type';
import { useEffect, useState } from 'react';
import { Control, useFieldArray, useFormState, UseFormSetValue, useWatch } from 'react-hook-form';
import {
    isSpecialGradeRow
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
    const [collapsedRungs, setCollapsedRungs] = useState<Record<number, boolean>>({});

    const { errors } = useFormState({ control });

    useEffect(() => {
        if (errors.transmutation_rows && Array.isArray(errors.transmutation_rows)) {
            errors.transmutation_rows.forEach((rErr, idx) => {
                if (rErr) {
                    setCollapsedRungs((prev) => ({ ...prev, [idx]: false }));
                }
            });
        }
    }, [errors]);

    function toggleRungCollapse(index: number) {
        setCollapsedRungs((prev) => ({ ...prev, [index]: !prev[index] }));
    }

    const { fields, append, remove, replace } = useFieldArray({
        control,
        name: 'transmutation_rows'
    });

    const rows = useWatch({ control, name: 'transmutation_rows' }) || [];

    const passingCount = rows.filter((r) => r.is_passing).length;
    const nonPassingCount = rows.length - passingCount;

    function handleAddRow() {
        const newRow: WizardTransmutationRow = {
            label: '',
            min_percentage: null,
            max_percentage: null,
            transmuted_grade: null,
            is_passing: true,
            is_conditional: false, // Default is Fixed
            special_code: null,
            description: ''
        };
        append(newRow);
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
                    <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
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
                                startIcon={<PlusIcon className="w-3.5 h-3.5" />}
                                variant="contained"
                                onClick={handleAddRow}
                            >
                                Add Grade Row
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
                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                    <span className="w-6 h-6 rounded-md bg-slate-200 dark:bg-zinc-700 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center justify-center shrink-0">
                                        #{index + 1}
                                    </span>
                                    <span className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">
                                        {row.label ? `Grade: ${row.label}` : `Grade Rung #${index + 1}`}
                                    </span>
                                    {row.description && (
                                        <span className="text-xs text-slate-500 dark:text-slate-400 truncate hidden sm:inline">
                                            ({row.description})
                                        </span>
                                    )}
                                    {!isCond && row.min_percentage !== null && row.max_percentage !== null && (
                                        <span className="px-2 py-0.5 text-[11px] font-medium rounded-full bg-slate-100 dark:bg-zinc-700 text-slate-600 dark:text-slate-300 shrink-0">
                                            {row.min_percentage}% - {row.max_percentage}%
                                        </span>
                                    )}
                                    <span className={`px-2 py-0.5 text-[11px] font-bold rounded-full shrink-0 ${row.is_passing ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'}`}>
                                        {row.is_passing ? 'Passing' : 'Failing'}
                                    </span>
                                </div>

                                <div className="flex items-center gap-1.5 shrink-0">
                                    {!disabled && (
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
                                    )}
                                    <button
                                        className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 font-medium flex items-center gap-1 p-1.5 rounded-lg hover:bg-slate-200/60 dark:hover:bg-zinc-700/50 transition-colors cursor-pointer"
                                        title={collapsedRungs[index] ? 'Expand grade rung' : 'Collapse grade rung'}
                                        type="button"
                                        aria-label={collapsedRungs[index] ? 'Expand grade rung' : 'Collapse grade rung'}
                                        onClick={() => toggleRungCollapse(index)}
                                    >
                                        <CaretDownIcon
                                            className={`w-4 h-4 transition-transform duration-200 ${collapsedRungs[index] ? '-rotate-90' : 'rotate-0'}`}
                                            weight="bold"
                                        />
                                        <span className="text-xs hidden sm:inline">{collapsedRungs[index] ? 'Expand' : 'Collapse'}</span>
                                    </button>
                                </div>
                            </div>

                            <div className={collapsedRungs[index] ? 'hidden' : 'space-y-4'}>

                            {/* Row 2: Type, Description, and Status */}
                            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                                {/* Type Selector */}
                                <div className="sm:col-span-4 md:col-span-3">
                                    <CommonSelect
                                        description="Choose whether this mark is a Fixed score range or a Conditional status grade (INC, DRP)."
                                        disabled={disabled}
                                        fullWidth
                                        label="Grade Type"
                                        options={[
                                            { label: 'Fixed Range', value: 'fixed' },
                                            { label: 'Conditional', value: 'conditional' }
                                        ]}
                                        size="small"
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
                                    />
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
                                <div className="sm:col-span-3 flex flex-col gap-(--mui-tokens-spacing-2) relative">
                                    <FormLabel
                                        className="tw_body_small_bold"
                                        description="Toggles whether this grade mark grants academic credit (Passing vs Failing)."
                                        label="Status"
                                    />
                                    <button
                                        className={`w-full h-9 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                                            row.is_passing
                                                ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                                                : 'bg-rose-100 text-rose-800 hover:bg-rose-200 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-300 dark:border-rose-800'
                                        } ${disabled ? 'cursor-default' : 'cursor-pointer'}`}
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
                                            error={Boolean((errors.transmutation_rows as any)?.[index]?.label)}
                                            fullWidth
                                            helperText={(errors.transmutation_rows as any)?.[index]?.label?.message}
                                            isRequired
                                            label="Mark / Grade"
                                            name={`transmutation_rows.${index}.label`}
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
                                            error={Boolean((errors.transmutation_rows as any)?.[index]?.label)}
                                            fullWidth
                                            helperText={(errors.transmutation_rows as any)?.[index]?.label?.message}
                                            isRequired
                                            label="Mark / Grade"
                                            name={`transmutation_rows.${index}.label`}
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
                                            error={Boolean((errors.transmutation_rows as any)?.[index]?.min_percentage)}
                                            fullWidth
                                            helperText={(errors.transmutation_rows as any)?.[index]?.min_percentage?.message}
                                            isRequired
                                            label="Min %"
                                            max={100}
                                            min={0}
                                            name={`transmutation_rows.${index}.min_percentage`}
                                            size="small"
                                            step={0.5}
                                            suffixText="%"
                                            value={row.min_percentage ?? ''}
                                            onChange={(val) => {
                                                setValue(
                                                    `transmutation_rows.${index}.min_percentage`,
                                                    val === undefined ? null : val,
                                                    { shouldDirty: true }
                                                );
                                            }}
                                        />
                                    </div>

                                    {/* Max % */}
                                    <div>
                                        <CommonNumberInput
                                            description="Maximum raw percentage allocated to this fixed grade mark."
                                            disabled={disabled}
                                            error={Boolean((errors.transmutation_rows as any)?.[index]?.max_percentage)}
                                            fullWidth
                                            helperText={(errors.transmutation_rows as any)?.[index]?.max_percentage?.message}
                                            isRequired
                                            label="Max %"
                                            max={100}
                                            min={0}
                                            name={`transmutation_rows.${index}.max_percentage`}
                                            size="small"
                                            step={0.5}
                                            suffixText="%"
                                            value={row.max_percentage ?? ''}
                                            onChange={(val) => {
                                                setValue(
                                                    `transmutation_rows.${index}.max_percentage`,
                                                    val === undefined ? null : val,
                                                    { shouldDirty: true }
                                                );
                                            }}
                                        />
                                    </div>
                                </div>
                            )}
                            </div>
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
                    cancelProps: {
                        onClick: () => setDeleteRungTarget(null)
                    },
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
