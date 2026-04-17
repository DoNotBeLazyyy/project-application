import CommonPagination, { CommonPaginationProps } from '@components/pagination/CommonPagination';
import { CardActionsProps } from '@mui/material';
import { StateProps } from '@type/common.type';
import { PaginationData } from '@type/table.type';

export interface TableCardPaginationProps extends CardActionsProps, CommonPaginationProps {
    // The data object containing current page, limit, and total counts
    pagination: PaginationData;

    // Function to update the pagination state
    onSetPagination: StateProps<PaginationData>;
}

/**
 * TableCardPagination
 *
 * A footer component for the TableCard that renders pagination controls.
 * It acts as a styled wrapper around CommonPagination.
 *
 * @example
 * <TableCard>
 *  <TableCardHeader title="Table Card Title">
 *  <TableCardControls allowCreate={true} />
 *  </TableCardHeader>
 *  <TableCardContent
 *  leadingColumnDefs={columnDefs}
 *  rowData={displayedData}
 *  />
 *  <TableCardPagination
 *  pagination={paginationState}
 *  onSetPagination={handlePageChange}
 *  />
 * </TableCard>
 */
export default function TableCardPagination({
    pagination,
    onSetPagination
}: TableCardPaginationProps) {
    return (
        <CommonPagination
            className="flex h-18 items-center"
            pagination={pagination}
            onSetPagination={onSetPagination}
        />
    );
}