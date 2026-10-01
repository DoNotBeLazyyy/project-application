import CommonButton from '@components/button/CommonButton';
import CommonForm from '@components/form/CommonForm';
import { FormFieldConfig } from '@components/form/FormField';
import CommonModal from '@components/modal/CommonModal';
import {
    ArrowsClockwiseIcon,
    CheckCircleIcon,
    CheckIcon,
    LockIcon,
    PencilSimpleIcon,
    PlusIcon,
    TrashIcon,
    XIcon
} from '@phosphor-icons/react';
import { GradingComponent, GradingComponentFormValues } from '@type/faculty.type';
import { formErrors } from '@utils/form.util';
import { useEffect, useState } from 'react';
import { FieldErrors, useForm } from 'react-hook-form';

const CREATE_FORM_ID = 'create-component-form';

const defaultFormValues: GradingComponentFormValues = {
    name: '',
    weight: ''
};

const componentFields: FormFieldConfig<GradingComponentFormValues>[] = [
    {
        name: 'name',
        rules: { required: 'Required' },
        type: 'text'
    },
    {
        name: 'weight',
        rules: {
            required: 'Required',
            min: { value: 1, message: 'Must be at least 1' },
            max: { value: 100, message: 'Cannot exceed 100' }
        },
        type: 'number'
    }
];

interface DraftRow {
    id: string;
    name: string;
    weight: number;
    isNew?: boolean;
}

interface GradingComponentPanelProps {
    components: GradingComponent[];
    locked: boolean;
    periodName?: string;
    periodWeight?: number;
    onCreate: (values: GradingComponentFormValues) => Promise<void>;
    onDelete: (componentId: string) => Promise<void>;
    onReseed: () => Promise<void>;
    onUpdate: (componentId: string, values: GradingComponentFormValues) => Promise<void>;
    onBatchSave?: (
        updates: { id: string; name: string; weight: number }[],
        creates: { name: string; weight: number }[],
        deletes: string[]
    ) => Promise<void>;
}

export default function GradingComponentPanel({
    components,
    locked,
    periodName,
    periodWeight,
    onCreate,
    onDelete,
    onReseed,
    onUpdate,
    onBatchSave
}: GradingComponentPanelProps) {
    const [isEditMode, setIsEditMode] = useState(false);
    const [draftRows, setDraftRows] = useState<DraftRow[]>([]);
    const [deletedIds, setDeletedIds] = useState<string[]>([]);
    const [isSaving, setIsSaving] = useState(false);

    // Standalone Create Modal
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const createMethods = useForm<GradingComponentFormValues>({ defaultValues: defaultFormValues });

    // Sync draftRows with incoming components whenever not actively editing
    useEffect(() => {
        if (!isEditMode) {
            setDraftRows(
                components.map((c) => ({
                    id: c.id,
                    name: c.name,
                    weight: c.weight
                }))
            );
            setDeletedIds([]);
        }
    }, [components, isEditMode]);

    function handleEnterEditMode() {
        setDraftRows(
            components.map((c) => ({
                id: c.id,
                name: c.name,
                weight: c.weight
            }))
        );
        setDeletedIds([]);
        setIsEditMode(true);
    }

    function handleCancelEditMode() {
        setDraftRows(
            components.map((c) => ({
                id: c.id,
                name: c.name,
                weight: c.weight
            }))
        );
        setDeletedIds([]);
        setIsEditMode(false);
    }

    function handleRowNameChange(id: string, name: string) {
        setDraftRows((prev) =>
            prev.map((row) => (row.id === id ? { ...row, name } : row))
        );
    }

    function handleRowWeightChange(id: string, weightVal: number) {
        const cleanWeight = Math.max(0, Math.min(100, isNaN(weightVal) ? 0 : weightVal));
        setDraftRows((prev) =>
            prev.map((row) => (row.id === id ? { ...row, weight: cleanWeight } : row))
        );
    }

    function handleAddDraftRow() {
        const currentSum = draftRows.reduce((sum, r) => sum + r.weight, 0);
        const remaining = Math.max(0, 100 - currentSum);
        const newRow: DraftRow = {
            id: `temp-${Date.now()}-${Math.random()}`,
            isNew: true,
            name: '',
            weight: remaining
        };
        setDraftRows((prev) => [...prev, newRow]);
    }

    function handleRemoveDraftRow(id: string, isNew?: boolean) {
        if (!isNew) {
            setDeletedIds((prev) => [...prev, id]);
        }
        setDraftRows((prev) => prev.filter((r) => r.id !== id));
    }

    const draftTotalWeight = draftRows.reduce((sum, r) => sum + r.weight, 0);
    const hasInvalidName = draftRows.some((r) => !r.name.trim());
    const isSaveDisabled = isSaving || draftTotalWeight !== 100 || hasInvalidName || draftRows.length === 0;

    async function handleSimultaneousSave() {
        if (isSaveDisabled) return;

        setIsSaving(true);
        try {
            const creates: { name: string; weight: number }[] = [];
            const updates: { id: string; name: string; weight: number }[] = [];

            for (const row of draftRows) {
                if (row.isNew) {
                    creates.push({ name: row.name.trim(), weight: row.weight });
                } else {
                    const original = components.find((c) => c.id === row.id);
                    if (!original || original.name !== row.name.trim() || original.weight !== row.weight) {
                        updates.push({ id: row.id, name: row.name.trim(), weight: row.weight });
                    }
                }
            }

            if (onBatchSave) {
                await onBatchSave(updates, creates, deletedIds);
            } else {
                // Fallback: execute simultaneous promises
                // 1. Deletions
                await Promise.all(deletedIds.map((id) => onDelete(id)));

                // 2. Updates sorted so weight decreases execute first
                const sortedUpdates = [...updates].sort((a, b) => {
                    const origA = components.find((c) => c.id === a.id)?.weight ?? 0;
                    const origB = components.find((c) => c.id === b.id)?.weight ?? 0;
                    return (a.weight - origA) - (b.weight - origB);
                });

                for (const u of sortedUpdates) {
                    await onUpdate(u.id, { name: u.name, weight: String(u.weight) });
                }

                // 3. Creations
                for (const c of creates) {
                    await onCreate({ name: c.name, weight: String(c.weight) });
                }
            }

            setIsEditMode(false);
            setDeletedIds([]);
        } finally {
            setIsSaving(false);
        }
    }

    // Modal Create
    async function handleCreateSubmit(values: GradingComponentFormValues) {
        await onCreate(values);
        createMethods.reset(defaultFormValues);
        setIsCreateOpen(false);
    }

    function handleCreateError(errors: FieldErrors<GradingComponentFormValues>) {
        formErrors(errors, createMethods);
    }

    const currentTotal = components.reduce((sum, c) => sum + c.weight, 0);

    return (
        <div className="flex flex-col flex-shrink-0 gap-3.5 w-full md:w-84 h-full min-h-0">
            {/* Header & Mode Controls */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-zinc-800 gap-2">
                <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                            Grading Components
                        </span>
                        {isEditMode && (
                            <span
                                className={`font-mono font-bold text-[11px] px-2 py-0.5 rounded-full border ${
                                    draftTotalWeight === 100
                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                                        : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
                                }`}
                            >
                                {draftTotalWeight}% / 100%
                            </span>
                        )}
                    </div>
                    <span className="text-[11px] text-slate-500 truncate">
                        {periodName ? `${periodName} Period` : 'Active Period'}{' '}
                        {periodWeight !== undefined ? `(${periodWeight}% of Final Grade)` : ''}
                    </span>
                </div>

                {!locked && (
                    <div className="flex items-center gap-1.5 shrink-0">
                        {isEditMode ? (
                            <>
                                <button
                                    type="button"
                                    onClick={handleCancelEditMode}
                                    disabled={isSaving}
                                    className="p-1.5 text-xs rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                                    title="Cancel Edit Mode"
                                >
                                    <XIcon size={16} weight="bold" />
                                </button>
                                <button
                                    type="button"
                                    onClick={handleSimultaneousSave}
                                    disabled={isSaveDisabled}
                                    className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                        isSaveDisabled
                                            ? 'bg-slate-200 text-slate-400 dark:bg-zinc-800 dark:text-zinc-600 cursor-not-allowed'
                                            : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                                    }`}
                                >
                                    <CheckIcon size={14} weight="bold" />
                                    <span>{isSaving ? 'Saving...' : 'Save'}</span>
                                </button>
                            </>
                        ) : (
                            <>
                                <CommonButton
                                    size="small"
                                    startIcon={<PencilSimpleIcon size={13} weight="bold" />}
                                    variant="outlined"
                                    onClick={handleEnterEditMode}
                                >
                                    Edit
                                </CommonButton>
                                <CommonButton
                                    disabled={currentTotal >= 100}
                                    size="small"
                                    startIcon={<PlusIcon size={14} weight="bold" />}
                                    variant="contained"
                                    onClick={() => setIsCreateOpen(true)}
                                >
                                    Add
                                </CommonButton>
                            </>
                        )}
                    </div>
                )}
            </div>

            {locked && (
                <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 flex gap-2 items-start p-2.5 rounded-xl text-amber-800 dark:text-amber-300">
                    <LockIcon className="mt-0.5 shrink-0" size={14} weight="bold" />
                    <span className="text-[11px] leading-tight">
                        Locked: grades have been recorded for this period, so components can no longer be edited.
                    </span>
                </div>
            )}

            {!locked && !isEditMode && components.length === 0 && (
                <CommonButton
                    size="small"
                    startIcon={<ArrowsClockwiseIcon size={14} weight="bold" />}
                    variant="outlined"
                    onClick={onReseed}
                >
                    Reseed from Schema Defaults
                </CommonButton>
            )}

            {/* Components Container */}
            <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-2.5 pr-1">
                {isEditMode ? (
                    /* Edit Mode: In-Place Simultaneous Editing */
                    <div className="flex flex-col gap-2.5">
                        {draftRows.map((row) => (
                            <div
                                key={row.id}
                                className="bg-white dark:bg-zinc-900 border border-blue-300 dark:border-blue-700/80 rounded-2xl p-3 shadow-2xs flex flex-col gap-2 transition-all ring-1 ring-blue-500/20"
                            >
                                <div className="flex items-center gap-2">
                                    <input
                                        type="text"
                                        placeholder="Component name (e.g. Quizzes)"
                                        value={row.name}
                                        onChange={(e) => handleRowNameChange(row.id, e.target.value)}
                                        className="flex-1 px-3 py-1.5 text-xs sm:text-sm font-semibold rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50/70 dark:bg-zinc-800/80 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                                    />
                                    <div className="flex items-center gap-1 shrink-0">
                                        <input
                                            type="number"
                                            min={1}
                                            max={100}
                                            value={row.weight || ''}
                                            onChange={(e) => handleRowWeightChange(row.id, parseInt(e.target.value, 10))}
                                            className="w-16 px-2.5 py-1.5 text-xs sm:text-sm font-mono font-bold text-right rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50/70 dark:bg-zinc-800/80 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                                        />
                                        <span className="text-xs font-mono font-bold text-slate-500">%</span>
                                    </div>
                                    <button
                                        type="button"
                                        title="Delete row"
                                        onClick={() => handleRemoveDraftRow(row.id, row.isNew)}
                                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                                    >
                                        <TrashIcon size={16} weight="bold" />
                                    </button>
                                </div>

                                <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
                                    <span>
                                        {periodWeight !== undefined && row.weight
                                            ? `${((row.weight * periodWeight) / 100).toFixed(1)}% of course final`
                                            : 'Period component'}
                                    </span>
                                    {row.isNew && (
                                        <span className="text-blue-600 dark:text-blue-400 font-semibold">
                                            New Row
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))}

                        {/* Add Row Button inside Edit Mode */}
                        <button
                            type="button"
                            onClick={handleAddDraftRow}
                            className="p-2.5 rounded-xl border border-dashed border-slate-300 dark:border-zinc-700 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50/40 dark:hover:bg-blue-950/20 text-slate-600 dark:text-slate-400 hover:text-blue-600 flex items-center justify-center gap-1.5 text-xs font-semibold cursor-pointer transition-colors"
                        >
                            <PlusIcon size={14} weight="bold" />
                            Add Component Row
                        </button>
                    </div>
                ) : (
                    /* Read Mode: Bento Cards */
                    components.length === 0 ? (
                        <div className="flex flex-col items-center justify-center p-6 text-center border border-dashed border-slate-200 dark:border-zinc-800 rounded-2xl bg-white dark:bg-zinc-900/40">
                            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                No Components Configured
                            </span>
                            <p className="text-[11px] text-slate-400 mt-1 max-w-[200px]">
                                Add assessment components to calculate student grades for this period.
                            </p>
                        </div>
                    ) : (
                        components.map((component) => (
                            <div
                                key={component.id}
                                className="bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 rounded-2xl p-3.5 shadow-2xs flex flex-col justify-between gap-2.5 group hover:border-slate-300 dark:hover:border-zinc-700 transition-all"
                            >
                                <div className="flex items-center justify-between gap-2">
                                    <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-slate-100 truncate">
                                        {component.name}
                                    </span>
                                    <span className="font-mono font-bold text-xs px-2.5 py-0.5 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 shrink-0">
                                        {component.weight}%
                                    </span>
                                </div>

                                <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-zinc-800 text-[11px] text-slate-500">
                                    <span>
                                        {periodWeight !== undefined
                                            ? `${((component.weight * periodWeight) / 100).toFixed(1)}% of course`
                                            : 'Period Component'}
                                    </span>

                                    {!locked && (
                                        <div className="flex items-center gap-1">
                                            <button
                                                type="button"
                                                title="Edit all in Edit Mode"
                                                onClick={handleEnterEditMode}
                                                className="p-1 text-slate-400 hover:text-blue-600 rounded-md hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                                            >
                                                <PencilSimpleIcon size={14} weight="bold" />
                                            </button>
                                            <button
                                                type="button"
                                                title="Delete Component"
                                                onClick={() => onDelete(component.id)}
                                                className="p-1 text-slate-400 hover:text-rose-600 rounded-md hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                                            >
                                                <TrashIcon size={14} weight="bold" />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))
                    )
                )}
            </div>

            {/* Standalone Create Component Modal */}
            <CommonModal
                cardProps={{
                    cardHeaderProps: {
                        subheader: 'Add a new grading component to this period.',
                        title: 'New Component'
                    }
                }}
                open={isCreateOpen}
                onClose={() => setIsCreateOpen(false)}
            >
                <div className="flex flex-col gap-4 max-w-full sm:w-96 w-full">
                    <CommonForm
                        containerClassName="flex flex-col gap-4"
                        control={createMethods.control}
                        fields={componentFields}
                        formProps={{
                            id: CREATE_FORM_ID,
                            onSubmit: createMethods.handleSubmit(handleCreateSubmit, handleCreateError)
                        }}
                    />
                    <div className="flex gap-2 justify-end">
                        <CommonButton
                            color="inherit"
                            size="small"
                            variant="outlined"
                            onClick={() => setIsCreateOpen(false)}
                        >
                            Cancel
                        </CommonButton>
                        <CommonButton
                            form={CREATE_FORM_ID}
                            size="small"
                            type="submit"
                            variant="contained"
                        >
                            Create
                        </CommonButton>
                    </div>
                </div>
            </CommonModal>
        </div>
    );
}