import { DEFAULT_PAGINATION } from '@constants/table.constant';
import { CommonListResDto, SortStringDto } from '@type/http.type';
import { ServiceResult } from '@type/service.type';
import { PaginationData } from '@type/table.type';
import { GridApi } from 'ag-grid-community';
import { SetStateAction, useEffect, useRef, useState } from 'react';
import { FieldValues } from 'react-hook-form';

interface UseTableDataProps<T extends FieldValues> {
    dependencies: unknown[];
    onFetch?: (page: number, size: number, search: string, sort: SortStringDto[]) => Promise<ServiceResult<CommonListResDto<T>>>;
}

export function useTableData<T extends FieldValues>({
    dependencies,
    onFetch
}: UseTableDataProps<T>) {
    const onFetchRef = useRef(onFetch);
    const activeSearchRef = useRef('');
    const gridApiRef = useRef<GridApi | null>(null);
    const sortSourceRef = useRef<'modal' | 'grid' | null>(null);
    const [internalRowData, setInternalRowData] = useState<T[]>([]);
    const [internalSort, setInternalSort] = useState<SortStringDto[]>([]);
    const [pagination, setPagination] = useState<PaginationData>(DEFAULT_PAGINATION);
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);

    onFetchRef.current = onFetch;

    async function loadData(
        page: number,
        size: number,
        search: string,
        sort: SortStringDto[],
        isAppending = false
    ) {
        if (!isAppending) {
            setIsLoading(true);
        }
        try {
            const result = await onFetchRef.current?.(page, size, search, sort);
            if (result?.data) {
                const incomingRows = (result.data.content ?? []) as T[];
                if (isAppending) {
                    setInternalRowData((prev) => [...prev, ...incomingRows]);
                }
                else {
                    setInternalRowData(incomingRows);
                }

                setPagination({
                    currentPage: result.data.number + 1,
                    rowsPerPage: result.data.size,
                    totalElements: result.data.totalElements,
                    totalPages: result.data.totalPages
                });
            }
        }
        finally {
            if (!isAppending) {
                setIsLoading(false);
            }
        }
    }

    useEffect(() => {
        loadData(1, pagination.rowsPerPage, activeSearchRef.current, internalSort);
    }, [...dependencies]);

    function setGridApi(api: GridApi | null) {
        gridApiRef.current = api;
    }

    async function loadNextPage() {
        if (isLoadingMore || pagination.currentPage >= pagination.totalPages) {
            return;
        }

        setIsLoadingMore(true);
        try {
            await loadData(
                pagination.currentPage + 1,
                pagination.rowsPerPage,
                activeSearchRef.current,
                internalSort,
                true
            );
        }
        finally {
            setIsLoadingMore(false);
        }
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

    function handleSearchClear() {
        const hadActiveSearch = activeSearchRef.current.length > 0;

        activeSearchRef.current = '';
        setSearchQuery('');

        if (hadActiveSearch) {
            loadData(1, pagination.rowsPerPage, '', internalSort);
        }
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
        activeSearch: activeSearchRef.current,
        hasMore: pagination.currentPage < pagination.totalPages,
        internalRowData,
        internalSort,
        isLoading,
        isLoadingMore,
        loadData,
        loadNextPage,
        pagination,
        searchQuery,
        setGridApi,
        setInternalRowData,
        setSearchQuery,
        handleApplySort,
        handleGridSort,
        handleSearchClear,
        handleSearchSubmit,
        handleSetPagination
    };
}