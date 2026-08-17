import CaretDownStringIcon from '@components/icons/CaretDownStringIcon';
import CaretUpDownStringIcon from '@components/icons/CaretUpDownStringIcon';
import CaretUpStringIcon from '@components/icons/CaretUpStringIcon';
import TableActionCell, { TableActionCellBaseProps, TableActionCellRendererParams } from '@components/table/TableActionCell';
import { TABLE_ACTION_COL_ID, TABLE_ACTION_COL_WIDTH, TABLE_ACTION_COL_WIDTH_MOBILE } from '@constants/table.constant';
import useBreakpoint from '@hooks/useBreakpoint';
import { useLoadingStore } from '@stores/loading.store';
import { MobileCardColDef } from '@type/table.type';
import { ColDef } from 'ag-grid-community';
import { useMemo } from 'react';

export interface TableActionConfig<TData = unknown> extends TableActionCellBaseProps<TData> {
    actionColDef?: ColDef;
}

interface UseTableConfigsProps<TData = unknown> {
    defaultColDef?: ColDef;
    hasCheckbox?: boolean;
    leadingColumnDefs?: MobileCardColDef[];
    tableActionConfig?: TableActionConfig<TData>;
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

export function useTableConfigs<TData = unknown>({
    defaultColDef,
    hasCheckbox,
    leadingColumnDefs = [],
    tableActionConfig,
    trailingColumnDefs = []
}: UseTableConfigsProps<TData>) {
    const isLoading = useLoadingStore((state) => state.isLoading);
    const { isMobile } = useBreakpoint();
    const actionColumnWidth = isMobile
        ? TABLE_ACTION_COL_WIDTH_MOBILE
        : TABLE_ACTION_COL_WIDTH;
    const resolvedColumnDefs = useMemo<MobileCardColDef[]>(function() {
        const { actionColDef, actionContainerClassName, actionIconClassName, menuOptions, onEditClick } = tableActionConfig ?? {};

        return [
            ...withHeaderTooltip(leadingColumnDefs),
            ...(menuOptions || onEditClick
                ? [
                    {
                        cellClass: 'ignore_row_click',
                        cellRenderer: TableActionCell<TData>,
                        cellRendererParams: {
                            actionContainerClassName: actionContainerClassName,
                            actionIconClassName: actionIconClassName,
                            menuOptions: menuOptions,
                            onEditClick: onEditClick
                        } satisfies Partial<TableActionCellRendererParams<TData>>,
                        colId: TABLE_ACTION_COL_ID,
                        headerName: '',
                        maxWidth: actionColumnWidth,
                        minWidth: actionColumnWidth,
                        ...actionColDef
                    }
                ]
                : []
            ),
            ...withHeaderTooltip(trailingColumnDefs)
        ];
    }, [
        actionColumnWidth,
        leadingColumnDefs,
        tableActionConfig,
        trailingColumnDefs
    ]);
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