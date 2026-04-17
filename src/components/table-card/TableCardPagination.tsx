import CommonPagination, { CommonPaginationProps } from '@components/pagination/CommonPagination';

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
    onSetPagination,
    ...props
}: CommonPaginationProps) {
    return <CommonPagination
        className="flex h-18 items-center"
        pagination={pagination}
        onSetPagination={onSetPagination}
        {...props}
    />;
}