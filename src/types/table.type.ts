// Pagination information
export interface PaginationData {
    // current page
    currentPage: number;

    // number of rows per page
    rowsPerPage: number;

    // total number of elements in the current page
    totalElements: number;

    // total number of pages
    totalPages: number;
}