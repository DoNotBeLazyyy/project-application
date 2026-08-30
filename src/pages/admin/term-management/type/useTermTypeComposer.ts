import {
    createTermType,
    deleteTermType,
    listTermTypes,
    updateTermType
} from '@services/term/term-type.service';
import { useToastStore } from '@stores/toast.store';
import { TermTypeFormValues, TermTypeListRow } from '@type/term/term-type.type';
import { useCallback, useEffect, useMemo, useState } from 'react';

function toComparable(items: TermTypeListRow[]): string {
    return JSON.stringify(items.map((item, index) => ({
        code: item.code,
        id: item.id,
        label: item.label,
        sequence: index + 1
    })));
}

export function useTermTypeComposer() {
    const [termTypes, setTermTypes] = useState<TermTypeListRow[]>([]);
    const [savedTermTypes, setSavedTermTypes] = useState<TermTypeListRow[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isUpdateOpen, setIsUpdateOpen] = useState(false);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<TermTypeListRow | null>(null);

    const snapshot = useMemo(() => toComparable(savedTermTypes), [savedTermTypes]);
    const isDirty = useMemo(() => toComparable(termTypes) !== snapshot, [termTypes, snapshot]);

    const load = useCallback(async function() {
        setIsLoading(true);

        const result = await listTermTypes(1, 100, '', [{ isAsc: true, sortKey: 'sequence' }]);

        if (result.data) {
            const sorted = [...result.data.content].sort((a, b) => a.sequence - b.sequence);
            setTermTypes(sorted);
            setSavedTermTypes(sorted);
        }

        setIsLoading(false);
    }, []);

    useEffect(function() {
        load();
    }, [load]);

    function handleMove(index: number, direction: number) {
        const targetIndex = index + direction;
        if (targetIndex < 0 || targetIndex >= termTypes.length) {
            return;
        }

        setTermTypes(function(prev) {
            const copy = [...prev];
            const [moved] = copy.splice(index, 1);
            copy.splice(targetIndex, 0, moved);
            return copy;
        });
    }

    function handleReset() {
        setTermTypes(savedTermTypes);
    }

    /**
     * Safely updates sequence numbers across all term types.
     * Uses a two-phase update (temporary offset then target index) to prevent
     * sequence uniqueness collisions enforced by the database procedure.
     */
    async function handleSaveOrder() {
        setIsSaving(true);

        try {
            // Phase 1: Assign temporary non-conflicting offset sequence
            for (let i = 0; i < termTypes.length; i++) {
                const item = termTypes[i];
                const res = await updateTermType(item.id, {
                    code: item.code,
                    description: item.description ?? '',
                    label: item.label,
                    sequence: String(1000 + i)
                });

                if (res.error) {
                    setIsSaving(false);
                    await load();
                    return;
                }
            }

            // Phase 2: Assign final 1-based sequential sequence
            for (let i = 0; i < termTypes.length; i++) {
                const item = termTypes[i];
                const res = await updateTermType(item.id, {
                    code: item.code,
                    description: item.description ?? '',
                    label: item.label,
                    sequence: String(i + 1)
                });

                if (res.error) {
                    setIsSaving(false);
                    await load();
                    return;
                }
            }

            useToastStore.getState()
                .showToast('Term type sequence updated successfully.', 'success');
        }
        catch {
            useToastStore.getState()
                .showToast('Failed to update term type sequence.', 'error');
        }
        finally {
            setIsSaving(false);
            await load();
        }
    }

    function handleOpenCreate() {
        setIsCreateOpen(true);
    }

    function handleCloseCreate() {
        setIsCreateOpen(false);
    }

    async function handleCreateSubmit(values: TermTypeFormValues) {
        const nextSequence = String(termTypes.length + 1);

        const result = await createTermType({
            code: values.code.trim()
                .toUpperCase(),
            description: values.description?.trim() ?? '',
            label: values.label.trim(),
            sequence: nextSequence
        });

        if (!result.error) {
            useToastStore.getState()
                .showToast('Term type created successfully.', 'success');
            handleCloseCreate();
            await load();
        }
    }

    function handleOpenEdit(row: TermTypeListRow) {
        setSelectedItem(row);
        setIsUpdateOpen(true);
    }

    function handleCloseEdit() {
        setIsUpdateOpen(false);
        setSelectedItem(null);
    }

    async function handleUpdateSubmit(values: TermTypeFormValues) {
        if (!selectedItem) {
            return;
        }

        const result = await updateTermType(selectedItem.id, {
            code: values.code.trim()
                .toUpperCase(),
            description: values.description?.trim() ?? '',
            label: values.label.trim(),
            sequence: String(selectedItem.sequence)
        });

        if (!result.error) {
            useToastStore.getState()
                .showToast('Term type updated successfully.', 'success');
            handleCloseEdit();
            await load();
        }
    }

    function handleOpenDelete(row: TermTypeListRow) {
        setSelectedItem(row);
        setIsDeleteOpen(true);
    }

    function handleCloseDelete() {
        setIsDeleteOpen(false);
        setSelectedItem(null);
    }

    async function handleConfirmDelete() {
        if (!selectedItem) {
            return;
        }

        const result = await deleteTermType(selectedItem.id);

        if (!result.error) {
            useToastStore.getState()
                .showToast('Term type deleted successfully.', 'success');
            handleCloseDelete();

            // Re-index remaining surviving items
            const remaining = termTypes.filter((t) => t.id !== selectedItem.id);
            if (remaining.length > 0) {
                // Phase 1
                for (let i = 0; i < remaining.length; i++) {
                    await updateTermType(remaining[i].id, {
                        code: remaining[i].code,
                        description: remaining[i].description ?? '',
                        label: remaining[i].label,
                        sequence: String(1000 + i)
                    });
                }
                // Phase 2
                for (let i = 0; i < remaining.length; i++) {
                    await updateTermType(remaining[i].id, {
                        code: remaining[i].code,
                        description: remaining[i].description ?? '',
                        label: remaining[i].label,
                        sequence: String(i + 1)
                    });
                }
            }

            await load();
        }
    }

    return {
        handleCloseCreate,
        handleCloseDelete,
        handleCloseEdit,
        handleConfirmDelete,
        handleCreateSubmit,
        handleMove,
        handleOpenCreate,
        handleOpenDelete,
        handleOpenEdit,
        handleReset,
        handleSaveOrder,
        handleUpdateSubmit,
        isCreateOpen,
        isDeleteOpen,
        isDirty,
        isLoading,
        isSaving,
        isUpdateOpen,
        selectedItem,
        termTypes
    };
}