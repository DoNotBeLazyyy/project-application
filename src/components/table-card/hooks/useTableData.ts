import { DEFAULT_PAGINATION } from '@constants/table.constant';
import { CommonListResDto, SortStringDto } from '@type/http.type';
import { ServiceResult } from '@type/service.type';
import { PaginationData } from '@type/table.type';
import { GridApi } from 'ag-grid-community';
import { SetStateAction, useEffect, useRef, useState } from 'react';
import { FieldValues } from 'react-hook-form';

interface UseTableDataProps<T extends FieldValues> {
    onFetch?: (page: number, size: number, search: string, sort: SortStringDto[]) => Promise<ServiceResult<CommonListResDto<T>>>;
    dependencies: unknown[];
}

export function useTableData<T extends FieldValues>({ onFetch, dependencies }: UseTableDataProps<T>) {
    const onFetchRef = useRef(onFetch);
    const activeSearchRef = useRef('');
    const gridApiRef = useRef<GridApi | null>(null);
    const sortSourceRef = useRef<'modal' | 'grid' | null>(null);
    const [internalRowData, setInternalRowData] = useState<T[]>([]);
    const [internalSort, setInternalSort] = useState<SortStringDto[]>([]);
    const [pagination, setPagination] = useState<PaginationData>(DEFAULT_PAGINATION);
    const [searchQuery, setSearchQuery] = useState('');

    onFetchRef.current = onFetch;

    async function loadData(page: number, size: number, search: string, sort: SortStringDto[]) {
        const result = await onFetchRef.current?.(page, size, search, sort);
        if (result?.data) {
            setInternalRowData(result.data.content as T[]);
            setPagination({
                currentPage: result.data.number + 1,
                rowsPerPage: result.data.size,
                totalElements: result.data.totalElements,
                totalPages: result.data.totalPages
            });
        }
    }

    useEffect(() => {
        loadData(1, pagination.rowsPerPage, activeSearchRef.current, internalSort);
    }, [...dependencies]);

    function setGridApi(api: GridApi | null) {
        gridApiRef.current = api;
    }

    function handleSetPagination(updater: SetStateAction<PaginationData>) {
        const next = typeof updater === 'function'
            ? updater(pagination)
            : updater;
        setPagination(next);
        loadData(next.currentPage, next.rowsPerPage, activeSearchRef.current, internalSort);
    }

    function handleSearchSubmit() {
        activeSearchRef.current = searchQuery;
        loadData(1, pagination.rowsPerPage, searchQuery, internalSort);
    }

    function handleApplySort(sort: SortStringDto[], source: 'modal' | 'grid' = 'modal') {
        setInternalSort(sort);
        sortSourceRef.current = source;

        if (source === 'modal') {
            gridApiRef.current?.applyColumnState({
                state: sort.map(function(s) {
                    return {
                        colId: s.sortKey,
                        sort: s.isAsc
                            ? 'asc'
                            : 'desc'
                    };
                }),
                defaultState: { sort: null }
            });
            loadData(1, pagination.rowsPerPage, activeSearchRef.current, sort);
        }
    }

    function handleGridSort(sort: SortStringDto[]) {
        handleApplySort(sort, 'grid');
        loadData(1, pagination.rowsPerPage, activeSearchRef.current, sort);
    }

    return {
        internalRowData,
        internalSort,
        pagination,
        searchQuery,
        setSearchQuery,
        setGridApi,
        loadData,
        handleSetPagination,
        handleSearchSubmit,
        handleApplySort,
        handleGridSort,
        activeSearch: activeSearchRef.current
    };
}