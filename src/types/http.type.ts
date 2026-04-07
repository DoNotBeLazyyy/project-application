// API response DTO
export interface Answer<T = unknown> {
    // Status code
    status: number;

    // Actual response content
    result: T;
}

// Common list request DTO
export interface CommonListReqDto {
    // Current page
    page: number;

    // Number of rows per page
    size: number;

    // Sort string data
    sortString?: SortStringDto[];
}

// Common list response DTO
export interface CommonListResDto<T> {
    // Content data
    content: T[];

    // Whether empty or not
    empty: boolean;

    // Whether first page or not
    first: true;

    // Whether last page or not
    last: boolean;

    // Page number
    number: number;

    // Number of content
    numberOfElements: number;

    // Page data
    pageable: PageDto;

    // Number of rows per page
    size: number;

    // Sort data
    sort: SortDto;

    // Total number of content
    totalElements: number;

    // Total pages
    totalPages: number;
}

// Page DTO
interface PageDto {
    // Offset
    offset: number;

    // Whether paged or not
    paged: boolean;

    // Page number
    pageNumber: number;

    // Page size
    pageSize: number;

    // Sort data
    sort: SortDto;

    // Whether unpaged or not
    unpaged: boolean;
}

// Sort DTO
interface SortDto {
    // Whether empty or not
    empty: boolean;

    // Whether sorted or not
    sorted: boolean;

    // Whether unsorted or not
    unsorted: boolean;
}

// Sort string DTO
export interface SortStringDto {
    // Whether sorting is ascending
    isAsc: boolean;

    // Sort column key
    sortKey: string;
}