import { TableCardContext } from '@constants/context/TableCardContext';
import Card, { CardProps } from '@mui/material/Card';
import { GridApiNull } from '@type/common.type';
import { useRef } from 'react';

/**
 * TableCard
 *
 * A layout container that provides a shared context for AG Grid API references.
 * It coordinates the state between its sub-components (Header, Controls, Content,
 * and Pagination) ensuring that actions like searching and filtering are
 * synchronized with the grid instance.
 *
 * @example
 * <TableCard>
 * <TableCardHeader
 * subheader="Table Card Subheader"
 * title="Table Card Title"
 * >
 * <TableCardControls allowCreate />
 * </TableCardHeader>
 * <TableCardContent
 * leadingColumnDefs={columnDefs}
 * rowData={displayedData}
 * />
 * <TableCardPagination
 * pagination={pagination}
 * onSetPagination={setPagination}
 * />
 * </TableCard>
 */
export default function TableCard({
    children,
    sx,
    ...props
}: CardProps) {
    const gridRef = useRef<GridApiNull>(null); // Stores the Ag-Grid API instance without triggering re-renders

    return (
        <TableCardContext.Provider
            value={{
                gridRef
            }}
        >
            <Card
                sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    height: '100%',
                    ...sx
                }}
                {...props}
            >
                {children}
            </Card>
        </TableCardContext.Provider>
    );
}