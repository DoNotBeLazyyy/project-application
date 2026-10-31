import CommonButton from '@components/button/CommonButton';
import CommonForm from '@components/form/CommonForm';
import { FormFieldConfig } from '@components/form/FormField';
import CommonInput from '@components/input/CommonInput';
import CommonNumberInput from '@components/input/CommonNumberInput';
import CommonModal from '@components/modal/CommonModal';
import DiscardChangesPromptModal from '@components/modal/DiscardChangesPromptModal';
import DraftRecoveryPromptModal from '@components/modal/DraftRecoveryPromptModal';
import { useFormDraft } from '@hooks/use-form-draft';
import {
    ArrowsClockwiseIcon,
    CheckIcon,
    LockIcon,
    PencilSimpleIcon,
    PlusIcon,
    TrashIcon,
    XIcon
} from '@phosphor-icons/react';
import { GradingComponent, GradingComponentFormValues } from '@type/faculty.type';
import { DEFAULT_FORM_OPTIONS, formErrors } from '@utils/form.util';
import { useEffect, useState } from 'react';
import { FieldErrors, useForm } from 'react-hook-form';

const CREATE_FORM_ID = 'create-component-form';

const defaultFormValues: GradingComponentFormValues = {
    name: '',
    weight: ''
};

// grading_components.weight CHECK (weight > 0 AND weight <= 100); a period's components must total 100%
function buildComponentFields(remainingWeight: number): FormFieldConfig<GradingComponentFormValues>[] {
    return [
        {
            label: 'Component Name',
            name: 'name',
            placeholder: 'e.g. Quizzes',
            rules: {
                required: 'Required',
                validate: (value) => String(value ?? '')
                    .trim() !== '' || 'Component name cannot be blank.'
            },
            type: 'text'
        },
        {
            fieldProps: { helperText: `${remainingWeight}% of this period is still unallocated.` },
            label: 'Weight (%)',
            name: 'weight',
            rules: {
                required: 'Required',
                min: { value: 1, message: 'Must be at least 1' },
                max: { value: 100, message: 'Cannot exceed 100' },
                validate: (value) => Number(value) <= remainingWeight || `Only ${remainingWeight}% is left in this period.`
            },
            type: 'number'
        }
    ];
}

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
    const [isDiscardCreateOpen, setIsDiscardCreateOpen] = useState(false);
    const createMethods = useForm<GradingComponentFormValues>({ ...DEFAULT_FORM_OPTIONS, defaultValues: defaultFormValues });

    const createDraft = useFormDraft<GradingComponentFormValues>({
        formId: CREATE_FORM_ID,
        control: createMethods.control,
        onRestore: (restoredValues) => {
            createMethods.reset({ ...defaultFormValues, ...restoredValues }, { keepDefaultValues: true });
        },
        enabled: isCreateOpen
    });

    function handleRequestCloseCreate() {
        if (createMethods.formState.isSubmitting) return;
        if (createDraft.hasRealChanges) {
            setIsDiscardCreateOpen(true);
            return;
        }
        createDraft.clearDraft();
        createMethods.reset(defaultFormValues);
        setIsCreateOpen(false);
    }

    function handleConfirmDiscardCreate() {
        createDraft.clearDraft();
        setIsDiscardCreateOpen(false);
        createMethods.reset(defaultFormValues);
        setIsCreateOpen(false);
    }

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
            prev.map((row) => (row.id === id
                ? { ...row, name }
                : row)));
    }

    function handleRowWeightChange(id: string, weightVal: number | undefined) {
        const cleanWeight = Math.max(0, Math.min(100, weightVal === undefined || isNaN(weightVal)
            ? 0
            : weightVal));
        setDraftRows((prev) =>
            prev.map((row) => (row.id === id
                ? { ...row, weight: cleanWeight }
                : row)));
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
    const hasInvalidWeight = draftRows.some((r) => r.weight <= 0);
    const isSaveDisabled = isSaving || draftTotalWeight !== 100 || hasInvalidName || hasInvalidWeight || draftRows.length === 0;

    async function handleSimultaneousSave() {
        if (isSaveDisabled) return;

        setIsSaving(true);
        try {
            const creates: { name: string; weight: number }[] = [];
            const updates: { id: string; name: string; weight: number }[] = [];

            for (const row of draftRows) {
                if (row.isNew) {
                    creates.push({ name: row.name.trim(), weight: row.weight });
                }
                else {
                    const original = components.find((c) => c.id === row.id);
                    if (!original || original.name !== row.name.trim() || original.weight !== row.weight) {
                        updates.push({
                            id: row.id, name: row.name.trim(), weight: row.weight
                        });
                    }
                }
            }

            if (onBatchSave) {
                await onBatchSave(updates, creates, deletedIds);
            }
            else {
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
        }
        finally {
            setIsSaving(false);
        }
    }

    // Modal Create
    async function handleCreateSubmit(values: GradingComponentFormValues) {
        await onCreate(values);
        createDraft.clearDraft();
        setIsDiscardCreateOpen(false);
        createMethods.reset(defaultFormValues);
        setIsCreateOpen(false);
    }

    function handleCreateError(errors: FieldErrors<GradingComponentFormValues>) {
        formErrors(errors, createMethods);
    }

    const currentTotal = components.reduce((sum, c) => sum + c.weight, 0);
    const componentFields = buildComponentFields(Math.max(0, 100 - currentTotal));

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
                        {periodName
                            ? `${periodName} Period`
                            : 'Active Period'}{' '}
                        {periodWeight !== undefined
                            ? `(${periodWeight}% of Final Grade)`
                            : ''}
                    </span>
                </div>

                {!locked && (
                    <div className="flex items-center gap-1.5 shrink-0">
                        {isEditMode
                            ? (
                                <>
                                    <button
                                        className="p-1.5 text-xs rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                                        disabled={isSaving}
                                        title="Cancel Edit Mode"
                                        type="button"
                                        onClick={handleCancelEditMode}
                                    >
                                        <XIcon
                                            size={16}
                                            weight="bold"
                                        />
                                    </button>
                                    <button
                                        className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                            isSaveDisabled
                                                ? 'bg-slate-200 text-slate-400 dark:bg-zinc-800 dark:text-zinc-600 cursor-not-allowed'
                                                : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                                        }`}
                                        disabled={isSaveDisabled}
                                        type="button"
                                        onClick={handleSimultaneousSave}
                                    >
                                        <CheckIcon
                                            size={14}
                                            weight="bold"
                                        />
                                        <span>{isSaving
                                            ? 'Saving...'
                                            : 'Save'}</span>
                                    </button>
                                </>
                            )
                            : (
                                <>
                                    <CommonButton
                                        size="small"
                                        startIcon={(
                                            <PencilSimpleIcon
                                                size={13}
                                                weight="bold"
                                            />
                                        )}
                                        variant="outlined"
                                        onClick={handleEnterEditMode}
                                    >
                                    Edit
                                    </CommonButton>
                                    <CommonButton
                                        disabled={currentTotal >= 100}
                                        size="small"
                                        startIcon={(
                                            <PlusIcon
                                                size={14}
                                                weight="bold"
                                            />
                                        )}
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
                    <LockIcon
                        className="mt-0.5 shrink-0"
                        size={14}
                        weight="bold"
                    />
                    <span className="text-[11px] leading-tight">
                        Locked: grades have been recorded for this period, so components can no longer be edited.
                    </span>
                </div>
            )}

            {!locked && !isEditMode && components.length === 0 && (
                <CommonButton
                    size="small"
                    startIcon={(
                        <ArrowsClockwiseIcon
                            size={14}
                            weight="bold"
                        />
                    )}
                    variant="outlined"
                    onClick={onReseed}
                >
                    Reseed from Schema Defaults
                </CommonButton>
            )}

            {/* Components Container */}
            <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-2.5 pr-1">
                {isEditMode
                    ? (
                        /* Edit Mode: In-Place Simultaneous Editing */
                        <div className="flex flex-col gap-2.5">
                            {draftRows.map((row) => (
                                <div
                                    className="bg-white dark:bg-zinc-900 border border-blue-300 dark:border-blue-700/80 rounded-2xl p-3 shadow-2xs flex flex-col gap-2 transition-all ring-1 ring-blue-500/20"
                                    key={row.id}
                                >
                                    <div className="flex items-start gap-2">
                                        <div className="flex-1 min-w-0">
                                            <CommonInput
                                                error={!row.name.trim()}
                                                fullWidth
                                                helperText={row.name.trim()
                                                    ? undefined
                                                    : 'Name is required.'}
                                                placeholder="Component name (e.g. Quizzes)"
                                                size="small"
                                                value={row.name}
                                                onChange={(e) => handleRowNameChange(row.id, e.target.value)}
                                            />
                                        </div>
                                        <div className="shrink-0 w-24">
                                            <CommonNumberInput
                                                error={row.weight <= 0}
                                                helperText={row.weight > 0
                                                    ? undefined
                                                    : 'Must be 1-100.'}
                                                max={100}
                                                maxDecimals={0}
                                                min={1}
                                                size="small"
                                                suffixText="%"
                                                value={row.weight || ''}
                                                onChange={(value) => handleRowWeightChange(row.id, value)}
                                            />
                                        </div>
                                        <button
                                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                                            title="Delete row"
                                            type="button"
                                            onClick={() => handleRemoveDraftRow(row.id, row.isNew)}
                                        >
                                            <TrashIcon
                                                size={16}
                                                weight="bold"
                                            />
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
                                className="p-2.5 rounded-xl border border-dashed border-slate-300 dark:border-zinc-700 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50/40 dark:hover:bg-blue-950/20 text-slate-600 dark:text-slate-400 hover:text-blue-600 flex items-center justify-center gap-1.5 text-xs font-semibold cursor-pointer transition-colors"
                                type="button"
                                onClick={handleAddDraftRow}
                            >
                                <PlusIcon
                                    size={14}
                                    weight="bold"
                                />
                                Add Component Row
                            </button>
                        </div>
                    )
                    : (
                        /* Read Mode: Bento Cards */
                        components.length === 0
                            ? (
                                <div className="flex flex-col items-center justify-center p-6 text-center border border-dashed border-slate-200 dark:border-zinc-800 rounded-2xl bg-white dark:bg-zinc-900/40">
                                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                    No Components Configured
                                    </span>
                                    <p className="text-[11px] text-slate-400 mt-1 max-w-[200px]">
                                    Add assessment components to calculate student grades for this period.
                                    </p>
                                </div>
                            )
                            : (
                                components.map((component) => (
                                    <div
                                        className="bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 rounded-2xl p-3.5 shadow-2xs flex flex-col justify-between gap-2.5 group hover:border-slate-300 dark:hover:border-zinc-700 transition-all"
                                        key={component.id}
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
                                                        className="p-1 text-slate-400 hover:text-blue-600 rounded-md hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                                                        title="Edit all in Edit Mode"
                                                        type="button"
                                                        onClick={handleEnterEditMode}
                                                    >
                                                        <PencilSimpleIcon
                                                            size={14}
                                                            weight="bold"
                                                        />
                                                    </button>
                                                    <button
                                                        className="p-1 text-slate-400 hover:text-rose-600 rounded-md hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                                                        title="Delete Component"
                                                        type="button"
                                                        onClick={() => onDelete(component.id)}
                                                    >
                                                        <TrashIcon
                                                            size={14}
                                                            weight="bold"
                                                        />
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
                onClose={handleRequestCloseCreate}
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
                            disabled={createMethods.formState.isSubmitting}
                            size="small"
                            variant="outlined"
                            onClick={handleRequestCloseCreate}
                        >
                            Cancel
                        </CommonButton>
                        <CommonButton
                            disabled={createMethods.formState.isSubmitting}
                            form={CREATE_FORM_ID}
                            loading={createMethods.formState.isSubmitting}
                            size="small"
                            type="submit"
                            variant="contained"
                        >
                            Create
                        </CommonButton>
                    </div>
                </div>
            </CommonModal>

            <DiscardChangesPromptModal
                open={isDiscardCreateOpen}
                onContinueEditing={() => setIsDiscardCreateOpen(false)}
                onDiscard={handleConfirmDiscardCreate}
            />

            <DraftRecoveryPromptModal
                open={createDraft.isPromptOpen}
                onContinue={createDraft.handleContinue}
                onDiscard={createDraft.handleDiscard}
            />
        </div>
    );
}