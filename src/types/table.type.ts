import { TableActionConfig } from '@components/table/useTableConfigs';
import { BooleanFunction } from '@type/common.type';
import { SortStringDto } from '@type/http.type';
import { ColDef } from 'ag-grid-community';
import { AgGridReactProps } from 'ag-grid-react';

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

type HeaderTextTransform = 'uppercase' | 'lowercase' | 'capitalize';

export interface CommonTableProps<TData = unknown> extends Omit<AgGridReactProps, 'columnDefs'> {
    containerClassName?: string;
    hasAction?: boolean;
    hasCheckbox?: boolean;
    headerTextTransform?: HeaderTextTransform;
    isDeselectedOnBlur?: boolean;
    leadingColumnDefs?: ColDef[];
    tableActionConfig?: TableActionConfig<TData>;
    trailingColumnDefs?: ColDef[];
    onConfirmSort?: BooleanFunction;
    onSetSort?: (sort: SortStringDto[]) => void;
}