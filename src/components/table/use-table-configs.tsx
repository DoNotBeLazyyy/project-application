import CaretDownStringIcon from '@components/icons/CaretDownStringIcon';
import CaretUpDownStringIcon from '@components/icons/CaretUpDownStringIcon';
import CaretUpStringIcon from '@components/icons/CaretUpStringIcon';
import { useLoadingStore } from '@stores/loading.store';
import { MobileCardColDef } from '@type/table.type';
import { ColDef } from 'ag-grid-community';
import { useMemo } from 'react';

interface UseTableConfigsProps {
    defaultColDef?: ColDef;
    hasCheckbox?: boolean;
    leadingColumnDefs?: MobileCardColDef[];
    trailingColumnDefs?: MobileCardColDef[];
}

function withHeaderTooltip(columnDefs: MobileCardColDef[]): MobileCardColDef[] {
    return columnDefs.map((columnDef) => {
        if (columnDef.headerTooltip !== undefined || typeof columnDef.headerName !== 'string' || !columnDef.headerName.trim()) {
            return columnDef;
        }

        return {
            ...columnDef,
            headerTooltip: columnDef.headerName
        };
    });
}

export function useTableConfigs({
    defaultColDef,
    hasCheckbox,
    leadingColumnDefs = [],
    trailingColumnDefs = []
}: UseTableConfigsProps) {
    const isLoading = useLoadingStore((state) => state.isLoading);
    const resolvedColumnDefs = useMemo<MobileCardColDef[]>(function() {
        return [
            ...withHeaderTooltip(leadingColumnDefs),
            ...withHeaderTooltip(trailingColumnDefs)
        ];
    }, [leadingColumnDefs, trailingColumnDefs]);
    const resolvedColDefs = useMemo<ColDef>(function() {
        const commonSortIconProps = {
            className: 'cursor-pointer font-[700] h-[1.125rem] text-current w-[1.125rem]'
        };

        return {
            icons: {
                sortAscending: CaretUpStringIcon(commonSortIconProps),
                sortDescending: CaretDownStringIcon(commonSortIconProps),
                sortUnSort: CaretUpDownStringIcon(commonSortIconProps),
                ...defaultColDef?.icons
            },
            resizable: false,
            sortable: false,
            suppressHeaderFilterButton: true,
            suppressMovable: true,
            headerClass: () => {
                return isLoading
                    ? 'disable_sort_interaction'
                    : '';
            },
            ...defaultColDef
        };
    }, [defaultColDef, isLoading]);

    const rowSelection = useMemo(function() {
        if (!hasCheckbox) {
            return undefined;
        }

        return {
            mode: 'multiRow' as const,
            checkboxSelection: true,
            headerCheckboxSelection: true,
            suppressRowClickSelection: true
        };
    }, [hasCheckbox]);

    return {
        resolvedColumnDefs,
        resolvedColDefs,
        rowSelection
    };
}