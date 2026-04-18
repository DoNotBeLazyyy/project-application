import { useTableConfigs } from '@components/table/useTableConfigs';
import { useTableLogic } from '@components/table/useTableLogic';
import { CommonTableProps } from '@type/table.type';
import { classMerge } from '@utils/css.util';
import { preventDefaultContextMenu } from '@utils/table.util';
import { AgGridReact } from 'ag-grid-react';
import { CSSProperties } from 'react';

export default function CommonTable<TData = unknown>({
    containerClassName,
    defaultColDef,
    hasCheckbox,
    headerTextTransform = 'uppercase',
    isDeselectedOnBlur,
    leadingColumnDefs = [],
    tableActionConfig,
    trailingColumnDefs = [],
    onConfirmSort,
    onGridReady,
    onRowClicked,
    onSetSort,
    ...props
}: CommonTableProps<TData>) {
    const {
        containerRef,
        handleGridReady,
        handleRowClicked,
        handleSortChanged
    } = useTableLogic({
        isDeselectedOnBlur,
        onConfirmSort,
        onGridReady,
        onRowClicked,
        onSetSort
    });
    const {
        resolvedColumnDefs,
        resolvedColDefs,
        rowSelection
    } = useTableConfigs<TData>({
        defaultColDef,
        hasCheckbox,
        leadingColumnDefs,
        tableActionConfig,
        trailingColumnDefs
    });

    return (
        <div
            className={classMerge(
                'ag-theme-quartz common_table h-full min-h-0 w-full',
                containerClassName
            )}
            ref={containerRef}
            style={{
                '--table-header-transform': headerTextTransform
            } as CSSProperties}
            onContextMenu={preventDefaultContextMenu}
        >
            <AgGridReact
                animateRows={false}
                columnDefs={resolvedColumnDefs}
                defaultColDef={resolvedColDefs}
                rowSelection={rowSelection}
                suppressCellFocus
                suppressMovableColumns
                suppressRowHoverHighlight
                unSortIcon
                onGridReady={handleGridReady}
                onRowClicked={handleRowClicked}
                onSortChanged={handleSortChanged}
                {...props}
            />
        </div>
    );
}