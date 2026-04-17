import CommonPagination, { CommonPaginationProps } from '@components/pagination/CommonPagination';
import { CardActionsProps } from '@mui/material';
import { StateProps } from '@type/common.type';
import { PaginationData } from '@type/table.type';

export interface TableCardPaginationProps extends CardActionsProps, CommonPaginationProps {
    // Function to update the pagination state.
    onSetPagination: StateProps<PaginationData>;

    // The data object containing current page, limit, and total counts.
    pagination: PaginationData;
}

/**
 * TableCardPagination
 *
 * A footer component for the TableCard that renders pagination controls.
 * It acts as a styled wrapper around CommonPagination, ensuring consistent
 * height and alignment at the bottom of the table container.
 *
 * @param {TableCardPaginationProps} props - The component props.
 * @param {PaginationType} props.pagination - The current pagination state including page and total count.
 * @param {Function} props.onSetPagination - Callback triggered when the page or limit changes.
 *
 * @example
 * <TableCard>
 * <TableCardContent rowData={data} />
 * <TableCardPagination
 * pagination={paginationState}
 * onSetPagination={handlePageChange}
 * />
 * </TableCard>
 */
export default function TableCardPagination({
    onSetPagination,
    pagination
}: TableCardPaginationProps) {
    return <CommonPagination
        className="flex h-18 items-center"
        pagination={pagination}
        onSetPagination={onSetPagination}
    />;
}