import { StateProps } from '@type/common.type';
import { PaginationData } from '@type/table.type';

/**
 * Calculates the range of items currently being displayed.
 *
 * @param currentPage - The current active page.
 * @param rowsPerPage - Items per page.
 * @param totalElements - Total items in the dataset.
 * @returns
 */
export function calculateRowRange(currentPage: number, rowsPerPage: number, totalElements: number) {
    if (totalElements === 0) {
        return { start: 0, end: 0 };
    }

    const start = (currentPage - 1) * rowsPerPage + 1;
    const end = Math.min(currentPage * rowsPerPage, totalElements);

    return { start, end };
}

/**
 * Clamps a page number within the valid range of 1 to totalPages.
 *
 * @param page - Requested page number.
 * @param totalPages - Maximum available pages.
 * @returns
 */
export function clampPage(page: number, totalPages: number): number {
    return Math.min(Math.max(page, 1), Math.max(1, totalPages));
}

/**
 * Updates the pagination state in the table.
 *
 * @param values value to change.
 * @param onSetPagination state setter function for the pagination data.
 */
export function changePagination(
    values: Partial<PaginationData>,
    onSetPagination: StateProps<PaginationData>
) {
    onSetPagination((prev) => ({
        ...prev,
        ...values
    }));
}