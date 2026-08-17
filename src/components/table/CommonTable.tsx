import MobileCardCell from '@components/table/MobileCardCell';
import { useTableConfigs } from '@components/table/useTableConfigs';
import { useTableLogic } from '@components/table/useTableLogic';
import useBreakpoint from '@hooks/useBreakpoint';
import { CommonTableProps } from '@type/table.type';
import { classMerge } from '@utils/css.util';
import { calculateMobileCardHeight, preventDefaultContextMenu, resolveMobileCardPlan } from '@utils/table.util';
import { IsFullWidthRowParams } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { CSSProperties } from 'react';

function isFullWidthCardRow(params: IsFullWidthRowParams): boolean {
    return !params.rowNode.rowPinned;
}

export default function CommonTable<TData = unknown>({
    containerClassName,
    defaultColDef,
    hasCheckbox,
    headerTextTransform = 'uppercase',
    isDeselectedOnBlur,
    isMobileCardDisabled,
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
    const { isMobile } = useBreakpoint();
    const isCardMode = isMobile && !isMobileCardDisabled;
    const mobileCardProps = isCardMode
        ? {
            fullWidthCellRenderer: MobileCardCell,
            fullWidthCellRendererParams: {
                columnDefs: resolvedColumnDefs,
                hasCheckbox: hasCheckbox,
                tableActionConfig: tableActionConfig
            },
            headerHeight: 0,
            isFullWidthRow: isFullWidthCardRow,
            rowHeight: calculateMobileCardHeight(resolveMobileCardPlan(resolvedColumnDefs).meta.length),
            suppressHorizontalScroll: true
        }
        : undefined;

    return (
        <div
            className={classMerge(
                'ag-theme-quartz common_table h-full min-h-0 w-full',
                isCardMode && 'common_table_cards',
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
                enableBrowserTooltips
                rowSelection={rowSelection}
                suppressCellFocus
                suppressMovableColumns
                suppressRowHoverHighlight
                onGridReady={handleGridReady}
                onRowClicked={handleRowClicked}
                onSortChanged={handleSortChanged}
                {...props}
                {...mobileCardProps}
            />
        </div>
    );
}