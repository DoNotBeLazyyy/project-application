import { PaginationData } from '@type/table.type';

// Default pagination for admin listing
export const DEFAULT_PAGINATION: PaginationData = {
    // current page number
    currentPage: 1,

    // number of rows per page
    rowsPerPage: 10,

    // total number of elements in the current page
    totalElements: 10,

    // total number of pages
    totalPages: 10
};