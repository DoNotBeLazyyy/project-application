import TableActionCell, { TableActionCellRendererParams } from '@components/table/TableActionCell';
import { TableActionConfig } from '@components/table/useTableConfigs';
import Checkbox from '@mui/material/Checkbox';
import { ChangeEventInput } from '@type/common.type';
import { MobileCardColDef } from '@type/table.type';
import { formatMobileCardValue, resolveMobileCardPlan } from '@utils/table.util';
import { ICellRendererParams } from 'ag-grid-community';
import {
    ComponentType, ReactNode, useEffect, useMemo, useState
} from 'react';

export interface MobileCardCellParams<TData = unknown> extends ICellRendererParams<TData> {
    columnDefs?: MobileCardColDef[];
    hasCheckbox?: boolean;
    tableActionConfig?: TableActionConfig<TData>;
}

function resolveColumnKey(columnDef: MobileCardColDef): string | undefined {
    return columnDef.colId ?? columnDef.field;
}

function renderColumnContent<TData>(columnDef: MobileCardColDef, params: ICellRendererParams<TData>): ReactNode {
    const columnKey = resolveColumnKey(columnDef);
    const value = columnKey
        ? params.api.getCellValue<unknown>({
            colKey: columnKey,
            rowNode: params.node,
            useFormatter: Boolean(columnDef.valueFormatter)
        })
        : undefined;

    if (typeof columnDef.cellRenderer === 'function') {
        const CellRenderer = columnDef.cellRenderer as ComponentType<ICellRendererParams<TData>>;
        const rendererParams = {
            ...params,
            colDef: columnDef,
            value
        } as unknown as ICellRendererParams<TData>;
        const extraParams = typeof columnDef.cellRendererParams === 'function'
            ? (columnDef.cellRendererParams as (input: ICellRendererParams<TData>) => object)(rendererParams)
            : columnDef.cellRendererParams as object | undefined;

        return (
            <CellRenderer
                {...rendererParams}
                {...(extraParams ?? {})}
            />
        );
    }

    return formatMobileCardValue(value);
}

export default function MobileCardCell<TData>({
    columnDefs = [],
    hasCheckbox,
    tableActionConfig,
    ...params
}: MobileCardCellParams<TData>) {
    const { node } = params;
    const [isSelected, setIsSelected] = useState(Boolean(node.isSelected()));
    const plan = useMemo(function() {
        return resolveMobileCardPlan(columnDefs);
    }, [columnDefs]);
    const cellParams = params as unknown as ICellRendererParams<TData>;
    const hasActions = Boolean(tableActionConfig?.menuOptions ?? tableActionConfig?.onEditClick);

    useEffect(function() {
        function handleRowSelected() {
            setIsSelected(Boolean(node.isSelected()));
        }

        node.addEventListener('rowSelected', handleRowSelected);

        return function() {
            node.removeEventListener('rowSelected', handleRowSelected);
        };
    }, [node]);

    function handleToggleSelected(event: ChangeEventInput) {
        node.setSelected(event.target.checked);
    }

    return (
        <div className="bg-(--mui-palette-grey-50) flex flex-col gap-1 mb-2 overflow-hidden px-3 py-3 rounded-lg w-full">
            <div className="flex gap-2 items-center justify-between min-h-9">
                <div className="flex flex-col min-w-0">
                    {plan.title && (
                        <span className="font-semibold leading-5 text-(--mui-palette-text-primary) text-sm truncate">
                            {renderColumnContent(plan.title, cellParams)}
                        </span>
                    )}
                    {plan.subtitle && (
                        <span className="leading-4 text-(--mui-palette-grey-500) text-xs truncate">
                            {renderColumnContent(plan.subtitle, cellParams)}
                        </span>
                    )}
                </div>
                <div className="flex ignore_row_click items-center shrink-0">
                    {hasCheckbox && (
                        <Checkbox
                            checked={isSelected}
                            className="h-11 w-11"
                            onChange={handleToggleSelected}
                        />
                    )}
                    {hasActions && (
                        <TableActionCell<TData>
                            {...(cellParams as TableActionCellRendererParams<TData>)}
                            actionContainerClassName={tableActionConfig?.actionContainerClassName}
                            actionIconClassName={tableActionConfig?.actionIconClassName}
                            menuOptions={tableActionConfig?.menuOptions}
                            onEditClick={tableActionConfig?.onEditClick}
                        />
                    )}
                </div>
            </div>
            {plan.meta.map(function(columnDef, index) {
                return (
                    <div
                        className="flex gap-3 items-center justify-between min-h-7"
                        key={resolveColumnKey(columnDef) ?? index}
                    >
                        <span className="shrink-0 text-(--mui-palette-grey-500) text-xs uppercase">
                            {columnDef.headerName}
                        </span>
                        <div className="flex justify-end min-w-0 overflow-hidden text-(--mui-palette-text-primary) text-sm truncate">
                            {renderColumnContent(columnDef, cellParams)}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}