import { CommonFormModalProps } from '@components/modal/CommonFormModal';
import { SortColumn } from '@components/modal/sort-modal/SortColumnItem';
import { TableCardControlsProps } from '@components/table-card/TableCardControls';
import { TableActionConfig } from '@components/table/useTableConfigs';
import { CardHeaderProps } from '@mui/material';
import { CommonListResDto, SortStringDto } from '@type/http.type';
import { ServiceResult } from '@type/service.type';
import { CommonTableProps } from '@type/table.type';
import { FieldValues } from 'react-hook-form';

export interface CommonTableCardProps<T extends FieldValues> {
    cardHeaderProps?: CardHeaderProps;
    controls?: TableCardControlsProps;
    createModalProps?: CommonFormModalProps;
    filterModalProps?: CommonFormModalProps;
    updateModalProps?: CommonFormModalProps;
    viewModalProps?: CommonFormModalProps;
    dependencies?: unknown[];
    sortColumns?: SortColumn[];
    tableActionConfig?: TableActionConfig<T> | ((onRequestDeleteRow: (id: string) => void) => TableActionConfig<T>);
    tableProps: CommonTableProps<T>;
    uniqueIdKey: keyof T;
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