import CommonBentoCard from '@components/card/CommonBentoCard';
import CommonCard from '@components/card/CommonCard';
import ConfirmPromptModal from '@components/modal/ConfirmPromptModal';
import DeletePromptModal from '@components/modal/DeletePromptModal';
import TableModals from '@components/modal/TableModals';
import UploadCsvModal from '@components/modal/UploadCsvModal';
import CommonPagination from '@components/pagination/CommonPagination';
import { useTableData } from '@components/table-card/hooks/useTableData';
import { useTableSelection } from '@components/table-card/hooks/useTableSelection';
import TableCardControls from '@components/table-card/TableCardControls';
import TableCardSelectionBar from '@components/table-card/TableCardSelectionBar';
import CommonTable from '@components/table/CommonTable';
import { ChangeEventInputTextarea, KeyboardEventDivElement } from '@type/common.type';
import { SortStringDto } from '@type/http.type';
import { CommonTableCardProps } from '@type/table-card.type';
import { classMerge } from '@utils/css.util';
import { formatMobileCardValue, resolveMobileCardPlan } from '@utils/table.util';
import { useState } from 'react';
import { FieldValues } from 'react-hook-form';

export default function CommonTableCard<T extends FieldValues>({
    cardHeaderProps,
    controls,
    createModalProps,
    dependencies = [],
    enableInfiniteScroll = true,
    filterModalProps,
    renderGridCard,
    showViewToggle = true,
    sortColumns,
    tableActionConfig,
    tableProps,
    uniqueIdKey,
    updateModalProps,
    uploadCsvModalProps,
    viewModalProps,
    viewMode = 'grid',
    onCreate,
    onDelete,
    onDeleteRow,
    onFetch,
    onFilter,
    onRowClick
}: CommonTableCardProps<T>) {
    const {
        activeSearch,
        hasMore,
        internalRowData,
        internalSort,
        isLoadingMore,
        loadData,
        loadNextPage,
        pagination,
        searchQuery,
        setGridApi,
        setSearchQuery,
        handleApplySort,
        handleGridSort,
        handleSearchClear,
        handleSearchSubmit,
        handleSetPagination
    } = useTableData({
        dependencies,
        onFetch
    });

    const {
        gridApi,
        selectedCount,
        handleGridReady,
        handleSelectionChanged
    } = useTableSelection({
        onGridApiReady: setGridApi,
        onGridReady: tableProps.onGridReady
    });

    const [activeViewMode, setActiveViewMode] = useState<'table' | 'grid'>(viewMode);
    const [isSortOpen, setIsSortOpen] = useState(false);
    const [isDiscardOpen, setIsDiscardOpen] = useState(false);
    const [isDeletePromptOpen, setIsDeletePromptOpen] = useState(false);
    const [pendingDeleteIds, setPendingDeleteIds] = useState<string[]>([]);
    const [gridSelectedIds, setGridSelectedIds] = useState<Set<string>>(new Set());

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
                setGridSelectedIds(new Set());
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
                setGridSelectedIds(new Set());
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
        if (activeViewMode === 'grid') {
            if (gridSelectedIds.size === 0) return;
            triggerDeletePrompt(Array.from(gridSelectedIds));
            return;
        }

        const selectedRows = gridApi?.getSelectedRows() ?? [];
        const ids = selectedRows.map(function(row) {
            return String((row as T)[uniqueIdKey]);
        });

        if (!ids.length) {
            return;
        }

        triggerDeletePrompt(ids);
    }

    function handleToggleGridSelect(id: string) {
        setGridSelectedIds(function(prev) {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            }
            else {
                next.add(id);
            }
            return next;
        });
    }

    function handleSelectAllGrid() {
        const allIds = internalRowData.map(function(item) {
            return String(item[uniqueIdKey]);
        });
        setGridSelectedIds(new Set(allIds));
    }

    function handleClearGridSelection() {
        setGridSelectedIds(new Set());
    }

    const effectiveSelectedCount = activeViewMode === 'grid'
        ? gridSelectedIds.size
        : selectedCount;

    function renderDefaultBentoCard(item: T, isSelected: boolean, onToggleSelect: () => void) {
        const columnDefs = tableProps.leadingColumnDefs ?? [];
        const plan = resolveMobileCardPlan(columnDefs);
        const id = String(item[uniqueIdKey]);

        const titleVal = plan.title?.field
            ? formatMobileCardValue(item[plan.title.field as keyof T])
            : 'Record Details';

        const subtitleVal = plan.subtitle?.field
            ? formatMobileCardValue(item[plan.subtitle.field as keyof T])
            : undefined;

        const codeCol = columnDefs.find(function(c) {
            const f = String(c.field ?? '')
                .toLowerCase();
            return (f.includes('code') || f.includes('number') || f.includes('id_number')) && c !== plan.title;
        });
        const codeVal = codeCol?.field
            ? String(item[codeCol.field as keyof T] ?? '')
            : undefined;

        const statusCol = columnDefs.find(function(c) {
            const f = String(c.field ?? '')
                .toLowerCase();
            return f === 'status' || f === 'state';
        });
        const statusVal = statusCol?.field
            ? String(item[statusCol.field as keyof T] ?? '')
            : undefined;

        let progress;
        if ('enrolled_count' in item && 'max_slots' in item) {
            const enrolled = Number(item['enrolled_count' as keyof T] ?? 0);
            const maxSlots = Number(item['max_slots' as keyof T] ?? 0);
            if (maxSlots > 0) {
                progress = {
                    current: enrolled,
                    label: 'Enrolled Capacity',
                    total: maxSlots
                };
            }
        }

        const metrics = plan.meta
            .filter(function(col) {
                return col !== statusCol && col !== codeCol;
            })
            .slice(0, 4)
            .map(function(col) {
                const rawVal = item[col.field as keyof T];
                const formattedVal = typeof col.valueFormatter === 'function'
                    ? col.valueFormatter({
                        api: gridApi as never,
                        colDef: col,
                        column: null as never,
                        context: null,
                        data: item,
                        node: null as never,
                        value: rawVal
                    })
                    : formatMobileCardValue(rawVal);

                return {
                    label: col.headerName ?? String(col.field),
                    value: formattedVal
                };
            });

        return (
            <CommonBentoCard
                code={codeVal}
                hasCheckbox={Boolean(tableProps.hasCheckbox || onDelete)}
                isSelected={isSelected}
                metrics={metrics}
                primaryAction={onRowClick
                    ? {
                        label: 'View Details',
                        onClick: function() {
                            onRowClick(id);
                        }
                    }
                    : undefined}
                progress={progress}
                status={statusVal}
                subtitle={subtitleVal}
                title={titleVal}
                onClick={onRowClick
                    ? function() {
                        onRowClick(id);
                    }
                    : undefined}
                onToggleSelect={onToggleSelect}
            />
        );
    }

    return (
        <CommonCard
            cardHeaderProps={{
                ...cardHeaderProps,
                action: (
                    <div className="flex flex-col gap-2 w-full">
                        {effectiveSelectedCount > 0 && (
                            <TableCardSelectionBar
                                selectedCount={effectiveSelectedCount}
                                totalCount={pagination.totalElements}
                                onClearSelection={function() {
                                    if (activeViewMode === 'grid') {
                                        handleClearGridSelection();
                                    }
                                    else {
                                        gridApi?.deselectAll();
                                    }
                                }}
                                onDeleteSelected={onDelete
                                    ? handleBulkDelete
                                    : undefined}
                                onSelectAll={activeViewMode === 'grid'
                                    ? handleSelectAllGrid
                                    : undefined}
                            />
                        )}
                        <TableCardControls
                            showViewToggle={showViewToggle}
                            tableButtonsProps={{
                                ...controls?.tableButtonsProps,
                                createButtonProps: createModalProps
                                    ? {
                                        onClick: function() {
                                            onCreate?.();
                                        }
                                    }
                                    : controls?.tableButtonsProps?.createButtonProps,
                                deleteButtonProps: onDelete && effectiveSelectedCount > 0
                                    ? {
                                        ...controls?.tableButtonsProps?.deleteButtonProps,
                                        onClick: handleBulkDelete
                                    }
                                    : undefined,
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
                            viewMode={activeViewMode}
                            onToggleViewMode={setActiveViewMode}
                        />
                    </div>
                )
            }}
            className="flex flex-col h-full"
        >
            {activeViewMode === 'grid'
                ? (
                    <div className="flex flex-col flex-1 min-h-0">
                        <div className="gap-4 grid grid-cols-1 md:grid-cols-2 p-4 sm:grid-cols-2 xl:grid-cols-4">
                            {internalRowData.map(function(item) {
                                const id = String(item[uniqueIdKey]);
                                const isSelected = gridSelectedIds.has(id);
                                return (
                                    <div key={id}>
                                        {renderGridCard
                                            ? renderGridCard(
                                                item,
                                                isSelected,
                                                function() {
                                                    handleToggleGridSelect(id);
                                                }
                                            )
                                            : renderDefaultBentoCard(
                                                item,
                                                isSelected,
                                                function() {
                                                    handleToggleGridSelect(id);
                                                }
                                            )
                                        }
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )
                : (
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
                )
            }

            {enableInfiniteScroll
                ? (
                    <div className="bg-(--mui-palette-grey-50) border-(--mui-palette-grey-100) border-t flex flex-wrap gap-3 items-center justify-between min-h-14 px-4 py-3">
                        <div className="font-medium text-(--mui-palette-text-secondary) text-xs">
                            Showing <span className="font-bold text-(--mui-palette-text-primary)">{internalRowData.length}</span> of <span className="font-bold text-(--mui-palette-text-primary)">{pagination.totalElements}</span> records • Page <span className="font-bold text-(--mui-palette-text-primary)">{pagination.currentPage}</span> of <span className="font-bold text-(--mui-palette-text-primary)">{pagination.totalPages}</span>
                        </div>
                        {hasMore && (
                            <button
                                className={classMerge(
                                    'bg-(--mui-palette-primary-main) font-bold hover:bg-(--mui-palette-primary-dark) px-4 py-1.5 rounded-lg text-white text-xs transition-colors shadow-xs',
                                    isLoadingMore
                                        ? 'opacity-60 cursor-not-allowed'
                                        : 'cursor-pointer'
                                )}
                                disabled={isLoadingMore}
                                type="button"
                                onClick={loadNextPage}
                            >
                                {isLoadingMore
                                    ? 'Loading next batch...'
                                    : 'Load More Records'}
                            </button>
                        )}
                    </div>
                )
                : (
                    <CommonPagination
                        className="flex items-center min-h-18 py-2"
                        pagination={pagination}
                        onSetPagination={handleSetPagination}
                    />
                )
            }

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

            {uploadCsvModalProps && (
                <UploadCsvModal {...uploadCsvModalProps} />
            )}

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