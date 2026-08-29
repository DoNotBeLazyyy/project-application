import { CommonFormModalProps } from '@components/modal/CommonFormModal';
import { SortColumn } from '@components/modal/sort-modal/SortColumnItem';
import { TableCardControlsProps } from '@components/table-card/TableCardControls';
import { TableActionConfig } from '@components/table/useTableConfigs';
import { CardHeaderProps } from '@mui/material';
import { CsvTemplateColumn, DetailedBulkImportResult } from '@type/bulk-import.type';
import { CommonListResDto, SortStringDto } from '@type/http.type';
import { ServiceResult } from '@type/service.type';
import { CommonTableProps } from '@type/table.type';
import { ReactNode } from 'react';
import { FieldValues } from 'react-hook-form';

export interface BentoGridResponsiveCols {
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
}

export interface UploadCsvModalProps {
    open: boolean;
    templateColumns: CsvTemplateColumn[];
    title?: string;
    templateDownloadFilename?: string;
    onClose: () => void;
    onBulkImport: (rows: Record<string, string>[]) => Promise<DetailedBulkImportResult>;
    onMapRow?: (row: Record<string, string>) => Record<string, string>;
    onSuccess?: () => void;
}

export interface TableCardSelectionBarProps {
    selectedCount: number;
    totalCount: number;
    entityName?: string;
    onSelectAll?: () => void;
    onClearSelection: () => void;
    onDeleteSelected?: () => void;
    isDeleting?: boolean;
    extraActions?: ReactNode;
}

export interface CommonTableCardProps<T extends FieldValues> {
    cardHeaderProps?: CardHeaderProps;
    controls?: TableCardControlsProps;
    createModalProps?: CommonFormModalProps;
    filterModalProps?: CommonFormModalProps;
    updateModalProps?: CommonFormModalProps;
    viewModalProps?: CommonFormModalProps;
    uploadCsvModalProps?: UploadCsvModalProps;
    dependencies?: unknown[];
    sortColumns?: SortColumn[];
    tableActionConfig?: TableActionConfig<T> | ((onRequestDeleteRow: (id: string) => void) => TableActionConfig<T>);
    tableProps: CommonTableProps<T>;
    uniqueIdKey: keyof T;
    viewMode?: 'table' | 'grid';
    enableInfiniteScroll?: boolean;
    showViewToggle?: boolean;
    gridColumns?: BentoGridResponsiveCols;
    renderGridCard?: (item: T, isSelected: boolean, onToggleSelect: () => void) => ReactNode;
    onDelete?: (ids: string[]) => Promise<ServiceResult<unknown>>;
    onDeleteRow?: (id: string) => Promise<ServiceResult<unknown>>;
    onFetch?: (
        page: number,
        size: number,
        search: string,
        sort: SortStringDto[]
    ) => Promise<ServiceResult<CommonListResDto<T>>>;
    onCreate?: () => void;
    onFilter?: () => void;
    onRowClick?: (id: string) => void;
    onSort?: (sort: SortStringDto[]) => void;
}