import { CommonFormModalProps } from '@components/modal/CommonFormModal';
import { SortColumn } from '@components/modal/sort-modal/SortColumnItem';
import { TableActionConfig } from '@components/table/use-table-configs';
import { TableCardModeToggleProps } from '@components/table-card/TableCardActionMenu';
import { TableCardControlsProps } from '@components/table-card/TableCardControls';
import { CardHeaderProps } from '@mui/material';
import { Icon } from '@phosphor-icons/react';
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
    onClose: VoidFunction;
    onBulkImport: (rows: Record<string, string>[]) => Promise<DetailedBulkImportResult>;
    onMapRow?: (row: Record<string, string>) => Record<string, string>;
    onSuccess?: VoidFunction;
}

export interface TableCardSelectionBarProps {
    selectedCount: number;
    totalCount: number;
    entityName?: string;
    deleteActionLabel?: string;
    deleteActionIcon?: ReactNode;
    onSelectAll?: VoidFunction;
    onClearSelection: VoidFunction;
    onDeleteSelected?: VoidFunction;
    isDeleting?: boolean;
    extraActions?: ReactNode;
}

export interface CommonTableCardDeleteModalProps {
    title?: string | ((count: number) => string);
    subTitle?: string;
    confirmText?: string;
    actionIcon?: Icon;
}

export interface CommonTableCardSelectionBarConfig {
    entityName?: string;
    deleteActionLabel?: string;
    deleteActionIcon?: ReactNode;
    extraActions?: (selectedIds: string[], clearSelection: VoidFunction) => ReactNode;
}

export interface CommonTableCardProps<T extends FieldValues> {
    cardHeaderProps?: CardHeaderProps;
    /**
     * Header copy revealed by an info icon beside the title. Defaults to
     * `cardHeaderProps.subheader`, which is then dropped as a visible line.
     */
    infoContent?: ReactNode;
    /**
     * Keeps `cardHeaderProps.subheader` on its own line instead of folding it
     * into the info icon. For headers whose subheader carries live status
     * rather than a static description of the page.
     */
    showSubheader?: boolean;
    controls?: TableCardControlsProps;
    modeToggle?: TableCardModeToggleProps;
    createModalProps?: CommonFormModalProps;
    filterModalProps?: CommonFormModalProps;
    updateModalProps?: CommonFormModalProps;
    viewModalProps?: CommonFormModalProps;
    uploadCsvModalProps?: UploadCsvModalProps;
    deleteModalProps?: CommonTableCardDeleteModalProps;
    selectionBarProps?: CommonTableCardSelectionBarConfig;
    dependencies?: unknown[];
    sortColumns?: SortColumn[];
    tableActionConfig?: TableActionConfig<T> | ((onRequestDeleteRow: (id: string) => void) => TableActionConfig<T>);
    tableProps: CommonTableProps<T>;
    uniqueIdKey: keyof T;
    viewMode?: 'table' | 'grid';
    enableInfiniteScroll?: boolean;
    showViewToggle?: boolean;
    gridColumns?: BentoGridResponsiveCols;
    renderGridCard?: (
        item: T,
        isSelected: boolean,
        onToggleSelect: VoidFunction,
        onRequestDeleteRow: (id: string) => void
    ) => ReactNode;
    onDelete?: (ids: string[]) => Promise<ServiceResult<unknown>>;
    onDeleteRow?: (id: string) => Promise<ServiceResult<unknown>>;
    onFetch?: (
        page: number,
        size: number,
        search: string,
        sort: SortStringDto[]
    ) => Promise<ServiceResult<CommonListResDto<T>>>;
    onCreate?: VoidFunction;
    onFilter?: VoidFunction;
    onRowClick?: (id: string) => void;
    onSort?: (sort: SortStringDto[]) => void;
}