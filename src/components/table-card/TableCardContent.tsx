import CommonTable, { CommonTableProps } from '@components/table/CommonTable';
import { useTableCardContext } from '@constants/context/TableCardContext';
import { CardContent } from '@mui/material';
import { GridReadyEvent } from 'ag-grid-community';

/**
 * TableCardContent
 *
 * Renders the main body of the card containing the data table. It acts as the
 * bridge between the AG Grid instance and the shared TableCardContext by
 * capturing the grid API on initialization.
 *
 * @param {CommonTableProps} props - The component props.
 * @param {ColDef[]} props.leadingColumnDefs - Configuration for the initial table columns.
 * @param {any[]} props.rowData - The data array to be displayed in the table.
 * @param {Function} [props.onGridReady] - Optional callback triggered when the grid is initialized.
 *
 * @example
 * <TableCard>
 * <TableCardHeader title="Table Card Title">
 * <TableCardControls />
 * </TableCardHeader>
 * <TableCardContent
 * leadingColumnDefs={columnDefs}
 * rowData={displayedData}
 * />
 * <TableCardPagination pagination={pagination} onSetPagination={setPagination} />
 * </TableCard>
 */
export default function TableCardContent({
    leadingColumnDefs,
    onGridReady,
    rowData,
    ...props
}: CommonTableProps) {
    const context = useTableCardContext(); // Syncs the grid API reference with the parent root

    /**
     * Handles the AG Grid initialization event.
     * Stores the grid API into a shared context and triggers any external callbacks.
     * * @param params - The event object containing the grid API and column API.
     */
    function handleGridReady(params: GridReadyEvent) {
        if (context) {
            context.gridRef.current = params.api;
        }

        onGridReady?.(params);
    }

    return (
        <CardContent
            sx={{
                flex: 1,
                minHeight: 0,
                padding: 0
            }}
        >
            <CommonTable
                leadingColumnDefs={leadingColumnDefs}
                rowData={rowData}
                onGridReady={handleGridReady}
                {...props}
            />
        </CardContent>
    );
}