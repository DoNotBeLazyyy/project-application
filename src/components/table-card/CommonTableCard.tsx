import CommonButton from '@components/button/CommonButton';
import CommonBentoCard from '@components/card/CommonBentoCard';
import CommonCard from '@components/card/CommonCard';
import CommonEmptyState from '@components/empty/CommonEmptyState';
import ConfirmPromptModal from '@components/modal/ConfirmPromptModal';
import DeletePromptModal from '@components/modal/DeletePromptModal';
import TableModals from '@components/modal/TableModals';
import UploadCsvModal from '@components/modal/UploadCsvModal';
import CommonPagination from '@components/pagination/CommonPagination';
import { useInfiniteScrollSentinel } from '@components/table-card/hooks/useInfiniteScrollSentinel';
import { useLastVisibleRow } from '@components/table-card/hooks/useLastVisibleRow';
import { useTableData } from '@components/table-card/hooks/useTableData';
import { useTableSelection } from '@components/table-card/hooks/useTableSelection';
import TableCardControls from '@components/table-card/TableCardControls';
import TableCardSelectionBar from '@components/table-card/TableCardSelectionBar';
import CommonTable from '@components/table/CommonTable';
import { ArrowUpIcon } from '@phosphor-icons/react';
import { ChangeEventInputTextarea, KeyboardEventDivElement } from '@type/common.type';
import { SortStringDto } from '@type/http.type';
import { CommonTableCardProps } from '@type/table-card.type';
import { formatMobileCardValue, resolveMobileCardPlan } from '@utils/table.util';
import { useRef, useState } from 'react';
import { FieldValues } from 'react-hook-form';

export default function CommonTableCard<T extends FieldValues>({
    cardHeaderProps,
    controls,
    createModalProps,
    dependencies = [],
    enableInfiniteScroll = true,
    filterModalProps,
    infoContent,
    renderGridCard,
    showSubheader = false,
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
        isLoading,
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

    const scrollRootRef = useRef<HTMLDivElement>(null);
    const sentinelRef = useRef<HTMLDivElement>(null);

    useInfiniteScrollSentinel({
        root: scrollRootRef,
        target: sentinelRef,
        hasMore,
        isLoading: isLoadingMore,
        onLoadMore: loadNextPage
    });

    const [activeViewMode, setActiveViewMode] = useState<'table' | 'grid'>(viewMode);
    const [isSortOpen, setIsSortOpen] = useState(false);
    const [isDiscardOpen, setIsDiscardOpen] = useState(false);
    const [isDeletePromptOpen, setIsDeletePromptOpen] = useState(false);
    const [pendingDeleteIds, setPendingDeleteIds] = useState<string[]>([]);
    const [gridSelectedIds, setGridSelectedIds] = useState<Set<string>>(new Set());

    const [canScrollUp, setCanScrollUp] = useState(false);

    const lastVisibleRow = useLastVisibleRow({
        root: scrollRootRef,
        rowCount: internalRowData.length,
        enabled: enableInfiniteScroll && activeViewMode === 'grid'
    });
    const shownCount = lastVisibleRow || internalRowData.length;

    function handleGridScroll() {
        setCanScrollUp((scrollRootRef.current?.scrollTop ?? 0) > 0);
    }

    function scrollGridToTop() {
        scrollRootRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function handleRequestDeleteRow(id: string) {
        triggerDeletePrompt([id]);
    }

    const resolvedTableActionConfig = typeof tableActionConfig === 'function'
        ? tableActionConfig(handleRequestDeleteRow)
        : tableActionConfig;

    const hasFilter = Boolean(filterModalProps);
    const hasSort = Boolean(sortColumns?.length);
    // Filter and Sort share one modal (and one menu entry) whenever both are configured
    const showCombinedFilterSort = hasFilter && hasSort;

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

    const isGridSelectionActive = activeViewMode === 'grid' && gridSelectedIds.size > 0;

    function renderDefaultBentoCard(item: T, isSelected: boolean, onToggleSelect: () => void) {
        const columnDefs = tableProps.leadingColumnDefs ?? [];
        const plan = resolveMobileCardPlan(columnDefs);
        const id = String(item[uniqueIdKey]);

        // 1. Title
        const titleVal = plan.title?.field
            ? formatMobileCardValue(item[plan.title.field as keyof T])
            : 'Record Details';

        // 2. Code Tag
        const codeCol = columnDefs.find(function(c) {
            const f = String(c.field ?? '')
                .toLowerCase();
            return (f.includes('code') || f.includes('number') || f.includes('id_number')) && c !== plan.title;
        });
        const codeVal = codeCol?.field
            ? String(item[codeCol.field as keyof T] ?? '')
            : undefined;

        // 3. Status
        const statusCol = columnDefs.find(function(c) {
            const f = String(c.field ?? '')
                .toLowerCase();
            return f === 'status' || f === 'state' || f === 'is_active';
        });
        let statusVal = statusCol?.field
            ? String(item[statusCol.field as keyof T] ?? '')
            : 'Active';
        if (statusVal === 'true') statusVal = 'Active';
        if (statusVal === 'false') statusVal = 'Inactive';

        // 4. Faculty In-Charge
        let faculty;
        const facultyCol = columnDefs.find(function(c) {
            const f = String(c.field ?? '')
                .toLowerCase();
            return f.includes('faculty') || f.includes('instructor') || f.includes('teacher');
        });
        const rawFaculty = facultyCol?.field
            ? item[facultyCol.field as keyof T]
            : (item['faculty_name' as keyof T] || item['instructor_name' as keyof T] || item['instructor' as keyof T] || item['faculty' as keyof T]);

        if (rawFaculty && String(rawFaculty)
            .trim().length > 0) {
            faculty = {
                avatarUrl: (item['faculty_avatar' as keyof T] || item['avatar_url' as keyof T] || item['avatar' as keyof T]) as string | undefined,
                name: String(rawFaculty),
                role: 'FACULTY IN-CHARGE'
            };
        }

        // 5. Capacity / Progress Bar
        let progress;
        const maxSlots = Number(item['max_slots' as keyof T] || item['slots' as keyof T] || item['capacity' as keyof T] || 0);
        if (maxSlots > 0) {
            const enrolled = Number(item['enrolled_count' as keyof T] || item['enrolled' as keyof T] || 0);
            progress = {
                current: enrolled,
                formatPercent: true,
                label: 'Capacity',
                total: maxSlots
            };
        }

        // 6. 2-Column Metrics (Schedule + Room & Units or Top Meta Columns)
        const metrics: { label: string; value: string }[] = [];

        // Check if schedule / time exists
        const schedVal = item['schedule' as keyof T] || item['schedule_desc' as keyof T] || item['days' as keyof T];
        if (schedVal) {
            metrics.push({
                label: 'Schedule',
                value: String(schedVal)
            });
        }

        // Check if room and/or units exist
        const roomVal = item['room' as keyof T] || item['room_name' as keyof T];
        const unitsVal = item['units' as keyof T] || item['lecture_units' as keyof T] || item['credit_hours' as keyof T];
        if (roomVal || unitsVal) {
            const combinedRoomUnits = [
                roomVal
                    ? String(roomVal)
                    : null,
                unitsVal
                    ? `${unitsVal} Units`
                    : null
            ].filter(Boolean)
                .join(' • ');

            metrics.push({
                label: 'Room & Units',
                value: combinedRoomUnits
            });
        }

        // Fill remaining slots up to 2 from meta columns
        if (metrics.length < 2) {
            const excludedCols = [plan.title, codeCol, statusCol, facultyCol];
            const remainingMeta = plan.meta.filter(function(col) {
                return !excludedCols.includes(col) && col.field !== 'max_slots' && col.field !== 'enrolled_count';
            });

            for (const col of remainingMeta) {
                if (metrics.length >= 2) break;
                const rawVal = item[col.field as keyof T];
                if (rawVal != null && String(rawVal)
                    .trim().length > 0) {
                    metrics.push({
                        label: col.headerName ?? String(col.field),
                        value: formatMobileCardValue(rawVal)
                    });
                }
            }
        }

        // 7. Footer Meta (Term / AY / Dept)
        const footerMeta = item['term_label' as keyof T]
            || item['term_name' as keyof T]
            || item['academic_year' as keyof T]
            || item['department_name' as keyof T]
            || '1st Sem AY 25-26';

        return (
            <CommonBentoCard
                code={codeVal}
                faculty={faculty}
                footerMeta={String(footerMeta)}
                hasCheckbox={Boolean(tableProps.hasCheckbox || onDelete)}
                isSelected={isSelected}
                metrics={metrics}
                primaryAction={onRowClick
                    ? {
                        label: 'Edit',
                        onClick: function() {
                            onRowClick(id);
                        }
                    }
                    : undefined}
                progress={progress}
                secondaryAction={onRowClick
                    ? {
                        label: 'Full Page',
                        onClick: function() {
                            onRowClick(id);
                        }
                    }
                    : undefined}
                status={statusVal}
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

    const hasNoData = !isLoading && internalRowData.length === 0;
    const hasActiveSearchOrFilter = Boolean(activeSearch || (searchQuery && searchQuery.trim()));

    // A static description of the page belongs behind the header's info icon
    // rather than on a permanent second line, which costs vertical space on
    // every list. `showSubheader` opts out for headers carrying live status.
    const resolvedInfoContent = infoContent ?? (showSubheader
        ? undefined
        : cardHeaderProps?.subheader);

    return (
        <CommonCard
            cardHeaderProps={{
                ...cardHeaderProps,
                subheader: showSubheader
                    ? cardHeaderProps?.subheader
                    : undefined,
                // Lift the header above the scrolling content so its shadow reads as a divider.
                // Blur == |spread| keeps the shadow strictly below the header (no side bleed
                // that would make it look like a floating boxed container).
                sx: {
                    position: 'relative',
                    zIndex: 1,
                    // Breathing room between the header content and the divider line/shadow
                    pb: 2.5,
                    borderBottom: '1px solid var(--mui-palette-grey-100)',
                    // Negative spread == blur keeps the shadow strictly below the header
                    // (square full-width ends, no side bleed); the larger blur/offset make
                    // it soft. It falls directly onto the content — no white gap between.
                    boxShadow: '0 10px 10px -10px rgb(15 23 42 / 0.18)',
                    ...(cardHeaderProps?.sx as object)
                },
                action: (
                    <div className="flex flex-col gap-2 w-full">
                        {/* Selecting any row swaps the standard controller out for bulk mode */}
                        {effectiveSelectedCount > 0
                            ? (
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
                            )
                            : (
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
                                        deleteButtonProps: undefined,
                                        filterSortButtonProps: hasFilter
                                            ? {
                                                children: hasSort
                                                    ? 'Filter & Sort'
                                                    : 'Filters',
                                                onClick: onFilter
                                            }
                                            : hasSort
                                                ? { children: 'Sort By', onClick: handleOpenSortModal }
                                                : controls?.tableButtonsProps?.filterSortButtonProps
                                    }}
                                    tableInputProps={{
                                        ...controls?.tableInputProps,
                                        onChange: handleSearchChange,
                                        onClear: handleSearchClear,
                                        onKeyDown: handleOnKeyDown,
                                        onSearch: handleSearchSubmit,
                                        value: searchQuery
                                    }}
                                    viewMode={activeViewMode}
                                    onToggleViewMode={setActiveViewMode}
                                />
                            )}
                    </div>
                )
            }}
            className="flex flex-col h-full"
            infoContent={resolvedInfoContent}
        >
            {hasNoData
                ? (
                    <CommonEmptyState
                        action={hasActiveSearchOrFilter
                            ? (
                                <CommonButton
                                    color="primary"
                                    size="small"
                                    variant="outlined"
                                    onClick={handleSearchClear}
                                >
                                    Clear Search
                                </CommonButton>
                            )
                            : (createModalProps || onCreate
                                ? (
                                    <CommonButton
                                        color="primary"
                                        size="small"
                                        variant="contained"
                                        onClick={function() {
                                            onCreate?.();
                                        }}
                                    >
                                        Add New Record
                                    </CommonButton>
                                )
                                : undefined)}
                        description={hasActiveSearchOrFilter
                            ? `No records match "${activeSearch || searchQuery}". Try checking for spelling errors or adjusting filters.`
                            : 'There are currently no records available to display in this list.'}
                        isSearch={hasActiveSearchOrFilter}
                        title={hasActiveSearchOrFilter
                            ? 'No matching results found'
                            : 'No data found'}
                    />
                )
                : activeViewMode === 'grid'
                    ? (
                        <div
                            className="flex flex-1 flex-col min-h-0 overflow-y-auto"
                            ref={scrollRootRef}
                            onScroll={handleGridScroll}
                        >
                            {/* Container-relative columns: as many as fit, capped at 4, min 1,
                            cards always stretch to fill the row. `auto-fit` + `1fr` fills the
                            width; the `calc` floor caps the count at 4; the `280px` floor
                            drops columns as the content area narrows (e.g. sidebar expanded). */}
                            <div
                                className="gap-4 grid px-4"
                                style={{
                                    gridTemplateColumns:
                                        'repeat(auto-fit, minmax(max(280px, calc((100% - 3rem) / 4)), 1fr))'
                                }}
                            >
                                {internalRowData.map(function(item, index) {
                                    const id = String(item[uniqueIdKey]);
                                    const isSelected = gridSelectedIds.has(id);
                                    return (
                                        <div
                                            data-row-index={index}
                                            key={id}
                                            onClickCapture={isGridSelectionActive
                                                ? function(event) {
                                                    // In select mode a card only toggles its own
                                                    // selection — view / edit / kebab are inert to
                                                    // avoid acting on a row mid-bulk-operation.
                                                    event.preventDefault();
                                                    event.stopPropagation();
                                                    handleToggleGridSelect(id);
                                                }
                                                : undefined}
                                        >
                                            {renderGridCard
                                                ? renderGridCard(
                                                    item,
                                                    isSelected,
                                                    function() {
                                                        handleToggleGridSelect(id);
                                                    },
                                                    handleRequestDeleteRow
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

                            {enableInfiniteScroll && (
                                <div
                                    className="flex font-medium items-center justify-center px-4 py-3 text-(--mui-palette-text-secondary) text-xs"
                                    ref={sentinelRef}
                                >
                                    {isLoadingMore
                                        ? 'Loading more…'
                                        : null}
                                </div>
                            )}
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

            {!hasNoData && (enableInfiniteScroll
                ? (
                    <div className="border border-(--mui-palette-grey-100) flex gap-3 items-center justify-between mx-4 my-2 px-4 py-1.5 rounded-full">
                        <button
                            aria-label="Scroll to top"
                            className="active:bg-(--mui-palette-primary-dark) bg-(--mui-palette-primary-main) cursor-pointer disabled:bg-(--mui-palette-grey-300) disabled:cursor-not-allowed duration-150 flex font-semibold gap-1.5 hover:bg-(--mui-palette-primary-dark) items-center px-3 py-1 rounded-full text-white text-xs transition-[background-color]"
                            disabled={!canScrollUp}
                            type="button"
                            onClick={scrollGridToTop}
                        >
                            <ArrowUpIcon size={14} weight="bold" />
                            Scroll to top
                        </button>
                        <span className="font-medium text-(--mui-palette-text-secondary) text-right text-xs">
                            Showing <span className="font-bold text-(--mui-palette-text-primary)">{shownCount}</span> of <span className="font-bold text-(--mui-palette-text-primary)">{pagination.totalElements}</span> records
                        </span>
                    </div>
                )
                : (
                    <CommonPagination
                        className="flex items-center min-h-18 py-2"
                        pagination={pagination}
                        onSetPagination={handleSetPagination}
                    />
                )
            )}

            <TableModals
                createModalProps={createModalProps}
                filterModalProps={!showCombinedFilterSort
                    ? filterModalProps
                    : undefined}
                filterSortModalProps={showCombinedFilterSort && filterModalProps
                    ? {
                        ...filterModalProps,
                        currentSort: internalSort,
                        sortColumns: sortColumns ?? [],
                        onApplySort: handleApplyTableSort
                    }
                    : undefined}
                sortModalProps={hasSort && !showCombinedFilterSort
                    ? {
                        columns: sortColumns ?? [],
                        currentSort: internalSort,
                        onApply: handleApplyTableSort,
                        onClose: handleCloseSortModal,
                        open: isSortOpen
                    }
                    : undefined}
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