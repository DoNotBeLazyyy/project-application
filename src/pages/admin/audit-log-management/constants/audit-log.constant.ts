import { SortColumn } from '@components/modal/sort-modal/SortColumnItem';
import { CommonSelectOption } from '@components/select/CommonSelect';

export const FILTER_FORM_ID = 'filter-audit-log-form';

export const ACTION_OPTIONS: CommonSelectOption[] = [
    { label: 'All Actions', value: 'All' },
    { label: 'INSERT (Create)', value: 'INSERT' },
    { label: 'UPDATE (Modify)', value: 'UPDATE' },
    { label: 'DELETE (Remove)', value: 'DELETE' }
];

export const SORT_COLUMNS: SortColumn[] = [
    { field: 'created_at', label: 'Timestamp' },
    { field: 'action', label: 'Action Type' },
    { field: 'event_name', label: 'Transaction Event' },
    { field: 'table_name', label: 'Entity / Table' },
    { field: 'changed_by_name', label: 'Operator' }
];