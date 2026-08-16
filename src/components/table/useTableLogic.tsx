import { useLoadingStore } from '@stores/loading.store';
import { BooleanFunction, GridApiNull, HtmlDivElementNull, NodeNull } from '@type/common.type';
import { SortStringDto } from '@type/http.type';
import { ColumnState, GridReadyEvent, RowClickedEvent, SortChangedEvent } from 'ag-grid-community';
import { useEffect, useRef, useState } from 'react';

interface UseTableLogicProps {
    isDeselectedOnBlur?: boolean;
    onConfirmSort?: BooleanFunction;
    onGridReady?: (event: GridReadyEvent) => void;
    onRowClicked?: (event: RowClickedEvent) => void;
    onSetSort?: (sort: SortStringDto[]) => void;
}

export function useTableLogic({
    isDeselectedOnBlur,
    onConfirmSort,
    onGridReady,
    onRowClicked,
    onSetSort
}: UseTableLogicProps) {
    const isLoading = useLoadingStore((state) => state.isLoading);
    const containerRef = useRef<HtmlDivElementNull>(null);
    const prevSortModelRef = useRef<ColumnState[]>([]);
    const isRestoringSortRef = useRef(false);
    const [gridApi, setGridApi] = useState<GridApiNull>(null);

    useEffect(() => {
        gridApi?.setGridOption('loading', isLoading);
    }, [isLoading, gridApi]);

    function handleGridReady(event: GridReadyEvent) {
        setGridApi(event.api);
        onGridReady?.(event);
    }

    function handleDocumentMouseDown(event: MouseEvent) {
        const isOutside = !containerRef.current?.contains(event.target as NodeNull);

        if (isOutside && isDeselectedOnBlur) {
            gridApi?.deselectAll();
        }
    }

    function handleRowClicked(event: RowClickedEvent) {
        const target = event.event?.target as HTMLElement;

        if (target?.closest('.ignore_row_click')) {
            return;
        }
        if (target?.closest('[col-id="ag-Grid-ControlsColumn"]')) {
            return;
        }

        onRowClicked?.(event);
    }

    function handleSortChanged(params: SortChangedEvent) {
        if (isRestoringSortRef.current) {
            isRestoringSortRef.current = false;
            return;
        }

        if (onConfirmSort && !onConfirmSort()) {
            isRestoringSortRef.current = true;
            params.api.applyColumnState({
                state: prevSortModelRef.current,
                defaultState: {
                    sort: null
                }
            });
            return;
        }

        const colState = params.api.getColumnState();
        prevSortModelRef.current = colState;

        onSetSort?.(colState.flatMap(function({ colId, sort }) {
            return sort !== null
                ? [{
                    isAsc: sort === 'asc',
                    sortKey: colId
                }]
                : [];
        }));
    }

    useEffect(function() {
        document.addEventListener('mousedown', handleDocumentMouseDown);

        return function() {
            document.removeEventListener('mousedown', handleDocumentMouseDown);
        };
    }, [gridApi, isDeselectedOnBlur]);

    return {
        containerRef,
        gridApi,
        handleGridReady,
        handleRowClicked,
        handleSortChanged
    };
}