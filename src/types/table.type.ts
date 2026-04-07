// Sort information
export interface SortData {
    // sort order.
    isAsc: boolean;

    // sort field key.
    sortKey: string;
}

// Pagination information
export interface PaginationData {
    // current page
    currentPage: number;

    // number of rows per page
    rowsPerPage: number;

    // total number of pages
    totalPages: number;

    // total number of elements in the current page
    totalElements: number;
}