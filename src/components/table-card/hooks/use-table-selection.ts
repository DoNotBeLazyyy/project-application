import { GridApiNull } from '@type/common.type';
import { GridApi, GridReadyEvent, SelectionChangedEvent } from 'ag-grid-community';
import { useCallback, useState } from 'react';

interface UseTableSelectionProps {
    onGridReady?: (event: GridReadyEvent) => void;
    onGridApiReady?: (api: GridApi) => void;
}

export function useTableSelection({
    onGridReady,
    onGridApiReady
}: UseTableSelectionProps = {}) {
    const [gridApi, setGridApi] = useState<GridApiNull>(null);
    const [selectedCount, setSelectedCount] = useState(0);

    const handleGridReady = useCallback(function(event: GridReadyEvent) {
        setTimeout(function() {
            setGridApi(event.api);
            onGridApiReady?.(event.api);
        }, 0);
        onGridReady?.(event);
    }, [onGridReady, onGridApiReady]);

    const handleSelectionChanged = useCallback(function(event: SelectionChangedEvent) {
        setSelectedCount(event.api.getSelectedNodes().length);
    }, []);

    return {
        gridApi,
        selectedCount,
        handleGridReady,
        handleSelectionChanged
    };
}