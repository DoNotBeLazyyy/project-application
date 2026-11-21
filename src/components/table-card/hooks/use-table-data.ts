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
    const internalSortRef = useRef<SortStringDto[]>([]);
    const fetchSequenceRef = useRef(0);
    const [internalRowData, setInternalRowData] = useState<T[]>([]);
    const [internalSort, setInternalSort] = useState<SortStringDto[]>([]);
    const [pagination, setPagination] = useState<PaginationData>(DEFAULT_PAGINATION);
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    // Message of the last failed page load, so the list can say it failed instead of "no records"
    const [loadError, setLoadError] = useState<string | null>(null);
    // Arguments of the last full-page load, replayed by retry()
    const lastLoadArgsRef = useRef<[number, number, string, SortStringDto[]]>([1, DEFAULT_PAGINATION.rowsPerPage, '', []]);

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
            lastLoadArgsRef.current = [page, size, search, sort];
        }
        const seq = ++fetchSequenceRef.current;
        try {
            let result: ServiceResult<CommonListResDto<T>> | undefined;
            try {
                result = await onFetchRef.current?.(page, size, search, sort);
            }
            catch (error) {
                result = {
                    data: null,
                    error: {
                        code: null,
                        message: error instanceof Error
                            ? error.message
                            : 'The list could not be loaded.',
                        status: null
                    }
                };
            }
            if (seq !== fetchSequenceRef.current) {
                return;
            }
            if (result?.error && !isAppending) {
                setLoadError(result.error.message || 'The list could not be loaded.');
                setInternalRowData([]);
                return;
            }
            if (result?.data) {
                const incomingRows = (result.data.content ?? []) as T[];

                // The page emptied (e.g. its last row was deleted): step back to the new last page
                if (!isAppending && incomingRows.length === 0 && page > 1 && result.data.totalElements > 0) {
                    const lastPage = Math.max(1, Math.min(page - 1, result.data.totalPages));
                    await loadData(lastPage, size, search, sort);
                    return;
                }

                setLoadError(null);
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
            // A superseded request must not clear the spinner of the newer one still in flight
            if (!isAppending && seq === fetchSequenceRef.current) {
                setIsLoading(false);
            }
        }
    }

    useEffect(() => {
        loadData(1, pagination.rowsPerPage, activeSearchRef.current, internalSortRef.current);
    }, [...dependencies]);

    function retry() {
        const [page, size, search, sort] = lastLoadArgsRef.current;
        loadData(page, size, search, sort);
    }

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
                internalSortRef.current,
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
        loadData(next.currentPage, next.rowsPerPage, activeSearchRef.current, internalSortRef.current);
    }

    function handleSearchSubmit() {
        activeSearchRef.current = searchQuery;
        loadData(1, pagination.rowsPerPage, searchQuery, internalSortRef.current);
    }

    function handleSearchClear() {
        const hadActiveSearch = activeSearchRef.current.length > 0;

        activeSearchRef.current = '';
        setSearchQuery('');

        if (hadActiveSearch) {
            loadData(1, pagination.rowsPerPage, '', internalSortRef.current);
        }
    }

    function handleApplySort(sort: SortStringDto[], source: 'modal' | 'grid' = 'modal') {
        internalSortRef.current = sort;
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
        loadError,
        loadNextPage,
        pagination,
        retry,
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