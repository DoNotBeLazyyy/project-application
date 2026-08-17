import CommonCard from '@components/card/CommonCard';
import ConfirmPromptModal from '@components/modal/ConfirmPromptModal';
import DeletePromptModal from '@components/modal/DeletePromptModal';
import TableModals from '@components/modal/TableModals';
import CommonPagination from '@components/pagination/CommonPagination';
import { useTableData } from '@components/table-card/hooks/useTableData';
import { useTableSelection } from '@components/table-card/hooks/useTableSelection';
import TableCardControls from '@components/table-card/TableCardControls';
import CommonTable from '@components/table/CommonTable';
import { ChangeEventInputTextarea, KeyboardEventDivElement } from '@type/common.type';
import { SortStringDto } from '@type/http.type';
import { CommonTableCardProps } from '@type/table-card.type';
import { useState } from 'react';
import { FieldValues } from 'react-hook-form';

export default function CommonTableCard<T extends FieldValues>({
    cardHeaderProps,
    controls,
    createModalProps,
    dependencies = [],
    filterModalProps,
    sortColumns,
    tableProps,
    tableActionConfig,
    uniqueIdKey,
    updateModalProps,
    viewModalProps,
    onDelete,
    onDeleteRow,
    onFetch,
    onCreate,
    onFilter,
    onRowClick
}: CommonTableCardProps<T>) {
    const {
        internalRowData,
        internalSort,
        pagination,
        searchQuery,
        setSearchQuery,
        setGridApi,
        loadData,
        handleSetPagination,
        handleSearchSubmit,
        handleSearchClear,
        handleApplySort,
        handleGridSort,
        activeSearch
    } = useTableData({ onFetch, dependencies });

    const {
        gridApi,
        selectedCount,
        handleGridReady,
        handleSelectionChanged
    } = useTableSelection({
        onGridReady: tableProps.onGridReady,
        onGridApiReady: setGridApi
    });

    const [isSortOpen, setIsSortOpen] = useState(false);
    const [isDiscardOpen, setIsDiscardOpen] = useState(false);
    const [isDeletePromptOpen, setIsDeletePromptOpen] = useState(false);
    const [pendingDeleteIds, setPendingDeleteIds] = useState<string[]>([]);

    function handleRequestDeleteRow(id: string) {
        triggerDeletePrompt([id]);
    }

    const resolvedTableActionConfig = typeof tableActionConfig === 'function'
        ? tableActionConfig(handleRequestDeleteRow)
        : tableActionConfig;

    function handleOpenSortModal() {
        setIsSortOpen(true);
    }

    function handleCloseSortModal() {
        setIsSortOpen(false);
    }

    function handleApplyTableSort(sort: SortStringDto[]) {
        handleApplySort(sort);
        handleCloseSortModal();
    }

    function handleSearchChange(e: ChangeEventInputTextarea) {
        setSearchQuery(e.target.value);
    }

    function handleOnKeyDown(event: KeyboardEventDivElement) {
        if (event.key === 'Enter') {
            handleSearchSubmit();
        }
    }

    function handleCloseUpdateModal() {
        if (updateModalProps?.onConfirmClose && !updateModalProps.onConfirmClose()) {
            setIsDiscardOpen(true);
            return;
        }
        updateModalProps?.onClose?.({}, 'escapeKeyDown');
    }

    function handleDiscardConfirm() {
        setIsDiscardOpen(false);
        updateModalProps?.onClose?.({}, 'escapeKeyDown');
    }

    function handleDiscardCancel() {
        setIsDiscardOpen(false);
    }

    function triggerDeletePrompt(ids: string[]) {
        setPendingDeleteIds(ids);
        setIsDeletePromptOpen(true);
    }

    async function handleConfirmDelete() {
        setIsDeletePromptOpen(false);

        if (pendingDeleteIds.length === 1 && onDeleteRow) {
            const result = await onDeleteRow(pendingDeleteIds[0]);
            if (!result?.error) {
                loadData(
                    pagination.currentPage,
                    pagination.rowsPerPage,
                    activeSearch,
                    internalSort
                );
            }
        }
        else if (onDelete) {
            const result = await onDelete(pendingDeleteIds);
            if (!result?.error) {
                gridApi?.deselectAll();
                loadData(
                    pagination.currentPage,
                    pagination.rowsPerPage,
                    activeSearch,
                    internalSort
                );
            }
        }

        setPendingDeleteIds([]);
    }

    function handleCancelDelete() {
        setIsDeletePromptOpen(false);
        setPendingDeleteIds([]);
    }

    async function handleBulkDelete() {
        const selectedRows = gridApi?.getSelectedRows() ?? [];
        const ids = selectedRows.map(function(row) {
            return String((row as T)[uniqueIdKey]);
        });

        if (!ids.length) {
            return;
        }

        triggerDeletePrompt(ids);
    }

    return (
        <CommonCard
            cardHeaderProps={{
                ...cardHeaderProps,
                action: (
                    <TableCardControls
                        tableButtonsProps={{
                            ...controls?.tableButtonsProps,
                            deleteButtonProps: onDelete
                                ? {
                                    ...controls?.tableButtonsProps?.deleteButtonProps,
                                    disabled: selectedCount === 0,
                                    onClick: handleBulkDelete
                                }
                                : undefined,
                            createButtonProps: createModalProps
                                ? {
                                    onClick: function() {
                                        onCreate?.();
                                    }
                                }
                                : controls?.tableButtonsProps?.createButtonProps,
                            filterButtonProps: filterModalProps
                                ? { onClick: onFilter }
                                : controls?.tableButtonsProps?.filterButtonProps,
                            sortButtonProps: sortColumns
                                ? { onClick: handleOpenSortModal }
                                : undefined
                        }}
                        tableInputProps={{
                            ...controls?.tableInputProps,
                            onChange: handleSearchChange,
                            onClear: handleSearchClear,
                            onKeyDown: handleOnKeyDown,
                            value: searchQuery
                        }}
                    />
                )
            }}
            className="flex flex-col h-full"
        >
            <CommonTable
                {...tableProps}
                alwaysMultiSort
                rowData={internalRowData}
                tableActionConfig={resolvedTableActionConfig}
                onGridReady={handleGridReady}
                onRowClicked={function(event) {
                    if (event.data) {
                        onRowClick?.((event.data as T)[uniqueIdKey] as string);
                    }
                    tableProps.onRowClicked?.(event);
                }}
                onSelectionChanged={handleSelectionChanged}
                onSetSort={handleGridSort}
            />
            <CommonPagination
                className="flex items-center min-h-18 py-2"
                pagination={pagination}
                onSetPagination={handleSetPagination}
            />
            <TableModals
                createModalProps={createModalProps}
                filterModalProps={filterModalProps}
                sortModalProps={{
                    columns: sortColumns ?? [],
                    currentSort: internalSort,
                    onApply: handleApplyTableSort,
                    onClose: handleCloseSortModal,
                    open: isSortOpen
                }}
                updateModalProps={
                    updateModalProps
                        ? {
                            ...updateModalProps,
                            onClose: handleCloseUpdateModal
                        }
                        : undefined
                }
                viewModalProps={viewModalProps}
            />
            <ConfirmPromptModal
                formButtonsProps={{
                    cancelProps: {
                        onClick: handleDiscardCancel
                    },
                    confirmProps: {
                        children: 'Discard',
                        color: 'error',
                        onClick: handleDiscardConfirm
                    }
                }}
                mainContent={{ title: 'Discard unsaved changes?' }}
                open={isDiscardOpen}
                subContent={{ title: 'Your changes will be lost. This cannot be undone.' }}
                onClose={handleDiscardCancel}
            />
            <DeletePromptModal
                formButtonsProps={{
                    cancelProps: {
                        onClick: handleCancelDelete
                    },
                    confirmProps: {
                        onClick: handleConfirmDelete
                    }
                }}
                mainContent={{
                    title: pendingDeleteIds.length > 1
                        ? `Delete ${pendingDeleteIds.length} records?`
                        : 'Delete this record?'
                }}
                open={isDeletePromptOpen}
                subContent={{ title: 'This action cannot be undone.' }}
                onClose={handleCancelDelete}
            />
        </CommonCard>
    );
}