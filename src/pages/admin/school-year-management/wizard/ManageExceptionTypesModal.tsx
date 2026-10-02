import CommonButton from '@components/button/CommonButton';
import CommonInput from '@components/input/CommonInput';
import CommonModal from '@components/modal/CommonModal';
import { CheckCircleIcon, GearIcon, PlusIcon, ProhibitIcon, TrashIcon, XIcon } from '@phosphor-icons/react';
import { useToastStore } from '@stores/toast.store';
import { ExceptionTypeOptionItem } from '@type/school-year.type';
import { useEffect, useMemo, useState } from 'react';

interface ManageExceptionTypesModalProps {
    open: boolean;
    exceptionTypes: ExceptionTypeOptionItem[];
    usedTypes?: string[];
    onClose: () => void;
    onSave: (updatedTypes: ExceptionTypeOptionItem[]) => void;
}

const DEFAULT_TYPE_NAMES = ['Holiday', 'Break', 'Suspension', 'Special Class', 'Exam Day'];

export default function ManageExceptionTypesModal({
    open,
    exceptionTypes,
    usedTypes = [],
    onClose,
    onSave
}: ManageExceptionTypesModalProps) {
    const [typeItems, setTypeItems] = useState<ExceptionTypeOptionItem[]>([]);
    const [newTypeInput, setNewTypeInput] = useState('');

    const usedTypeSet = useMemo(() => {
        return new Set(usedTypes.map((t) => t.trim().toLowerCase()));
    }, [usedTypes]);

    useEffect(() => {
        if (open) {
            setTypeItems(
                exceptionTypes.map((item) => ({
                    ...item,
                    is_default: item.is_default ?? DEFAULT_TYPE_NAMES.includes(item.label)
                }))
            );
            setNewTypeInput('');
        }
    }, [open, exceptionTypes]);

    function handleAddType() {
        const trimmed = newTypeInput.trim();
        if (!trimmed) return;

        if (typeItems.some((t) => t.label.toLowerCase() === trimmed.toLowerCase())) {
            useToastStore.getState().showToast(`Exception type "${trimmed}" already exists.`, 'error');
            return;
        }

        const newItem: ExceptionTypeOptionItem = {
            label: trimmed,
            is_active: true,
            is_default: false
        };

        setTypeItems([...typeItems, newItem]);
        setNewTypeInput('');
        useToastStore.getState().showToast(`Added new exception type "${trimmed}".`, 'success');
    }

    function handleToggleActive(targetLabel: string) {
        setTypeItems((prev) =>
            prev.map((item) => {
                if (item.label.toLowerCase() === targetLabel.toLowerCase()) {
                    const nextActive = !item.is_active;
                    if (!nextActive && usedTypeSet.has(targetLabel.toLowerCase())) {
                        useToastStore
                            .getState()
                            .showToast(
                                `Soft-deprecated "${item.label}". Existing records retain this type, but new entries cannot select it.`,
                                'info'
                            );
                    }
                    return { ...item, is_active: nextActive };
                }
                return item;
            })
        );
    }

    function handleHardRemove(targetLabel: string) {
        if (usedTypeSet.has(targetLabel.toLowerCase())) {
            useToastStore.getState().showToast(
                `Cannot permanently delete "${targetLabel}" because it is currently assigned to active records. Soft-deprecate it (toggle Inactive) instead.`,
                'error'
            );
            return;
        }

        if (typeItems.length <= 1) {
            useToastStore.getState().showToast('Cannot delete all exception types.', 'error');
            return;
        }

        setTypeItems((prev) => prev.filter((item) => item.label.toLowerCase() !== targetLabel.toLowerCase()));
        useToastStore.getState().showToast(`Removed exception type "${targetLabel}".`, 'success');
    }

    function handleSave() {
        if (typeItems.length === 0) {
            useToastStore.getState().showToast('Please keep at least one exception type.', 'error');
            return;
        }
        const activeCount = typeItems.filter((t) => t.is_active).length;
        if (activeCount === 0) {
            useToastStore.getState().showToast('Please ensure at least one exception type remains Active.', 'error');
            return;
        }

        onSave(typeItems);
        onClose();
        useToastStore.getState().showToast('Exception types updated successfully.', 'success');
    }

    return (
        <CommonModal
            cardProps={{
                className: 'w-full sm:max-w-lg p-0 overflow-hidden flex flex-col h-full sm:h-auto'
            }}
            fullWidth
            maxWidth="sm"
            open={open}
            onClose={onClose}
        >
            {/* Header */}
            <div className="p-4 border-b border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex items-center justify-between gap-3 shrink-0">
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-600 flex items-center justify-center shrink-0">
                        <GearIcon className="w-4 h-4" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                            Configure Exception Types (Soft Deprecation)
                        </h3>
                        <p className="text-xs text-slate-500">
                            Soft-deprecate obsolete types so past records remain accurate while restricting new entries.
                        </p>
                    </div>
                </div>

                <button
                    className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
                    type="button"
                    onClick={onClose}
                >
                    <XIcon className="w-4 h-4" />
                </button>
            </div>

            {/* Body */}
            <div className="p-4 space-y-4 bg-slate-50/50 dark:bg-zinc-900/40 text-xs">
                {/* Add New Type Field */}
                <div className="flex items-center gap-2">
                    <CommonInput
                        containerClassName="flex-1"
                        placeholder="Add custom exception type (e.g. University Week)"
                        size="small"
                        value={newTypeInput}
                        onChange={(e) => setNewTypeInput(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                handleAddType();
                            }
                        }}
                    />
                    <CommonButton
                        color="primary"
                        size="small"
                        startIcon={<PlusIcon className="w-3.5 h-3.5" />}
                        variant="contained"
                        onClick={handleAddType}
                    >
                        Add Type
                    </CommonButton>
                </div>

                {/* Exception Types List */}
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                    {typeItems.map((item) => {
                        const isUsed = usedTypeSet.has(item.label.toLowerCase());

                        return (
                            <div
                                key={item.label}
                                className={`flex items-center justify-between p-3 rounded-xl border text-xs transition-all ${
                                    !item.is_active
                                        ? 'bg-slate-100/80 dark:bg-zinc-800/40 border-slate-200 dark:border-zinc-700/50 opacity-75'
                                        : isUsed
                                            ? 'bg-amber-50/60 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/40'
                                            : 'bg-white dark:bg-zinc-800 border-slate-200 dark:border-zinc-700/80'
                                }`}
                            >
                                <div className="flex items-center gap-2 flex-wrap min-w-0">
                                    <span className={`font-semibold text-xs ${!item.is_active ? 'line-through text-slate-500' : 'text-slate-900 dark:text-slate-100'}`}>
                                        {item.label}
                                    </span>

                                    {/* Active / Inactive Badge */}
                                    {item.is_active ? (
                                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-semibold flex items-center gap-1">
                                            <CheckCircleIcon className="w-3 h-3" /> Active
                                        </span>
                                    ) : (
                                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-200 dark:bg-zinc-700 text-slate-600 dark:text-slate-400 font-semibold flex items-center gap-1">
                                            <ProhibitIcon className="w-3 h-3" /> Inactive (Deprecated)
                                        </span>
                                    )}

                                    {/* In Use Badge */}
                                    {isUsed && (
                                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 font-semibold border border-amber-300 dark:border-amber-800">
                                            In Use ({usedTypes.filter((u) => u.toLowerCase() === item.label.toLowerCase()).length})
                                        </span>
                                    )}
                                </div>

                                {/* Controls: Toggle Active / Inactive & Hard Delete */}
                                <div className="flex items-center gap-2 shrink-0">
                                    <button
                                        className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors ${
                                            item.is_active
                                                ? 'bg-slate-100 hover:bg-slate-200 dark:bg-zinc-700 dark:hover:bg-zinc-600 text-slate-700 dark:text-slate-200'
                                                : 'bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
                                        }`}
                                        title={item.is_active ? 'Deprecate (Hide for new entries)' : 'Re-activate type'}
                                        type="button"
                                        onClick={() => handleToggleActive(item.label)}
                                    >
                                        {item.is_active ? 'Deprecate' : 'Activate'}
                                    </button>

                                    <button
                                        className={`p-1.5 rounded-lg transition-colors ${
                                            isUsed
                                                ? 'text-slate-300 dark:text-zinc-600 cursor-not-allowed'
                                                : 'text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30'
                                        }`}
                                        disabled={isUsed}
                                        title={
                                            isUsed
                                                ? `Cannot delete "${item.label}" because it is currently assigned to entries. Soft-deprecate (toggle Inactive) instead.`
                                                : 'Delete unused type'
                                        }
                                        type="button"
                                        onClick={() => handleHardRemove(item.label)}
                                    >
                                        <TrashIcon className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex justify-end gap-2 shrink-0">
                <CommonButton
                    color="inherit"
                    size="small"
                    variant="outlined"
                    onClick={onClose}
                >
                    Cancel
                </CommonButton>
                <CommonButton
                    color="primary"
                    size="small"
                    variant="contained"
                    onClick={handleSave}
                >
                    Save Changes
                </CommonButton>
            </div>
        </CommonModal>
    );
}
