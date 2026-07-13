import { SortColumn } from '@components/modal/sort-modal/SortColumnItem';
import { CommonSelectOption } from '@components/select/CommonSelect';

export const FILTER_FORM_ID = 'filter-audit-log-form';

export const ACTION_OPTIONS: CommonSelectOption[] = [
    { label: 'All Actions', value: 'All' },
    { label: 'Insert', value: 'Insert' },
    { label: 'Update', value: 'Update' },
    { label: 'Delete', value: 'Delete' }
];

export const SORT_COLUMNS: SortColumn[] = [
    { field: 'changed_at', label: 'Date' },
    { field: 'action', label: 'Action' },
    { field: 'table_name', label: 'Table' },
    { field: 'changed_by_name', label: 'Changed By' },
    { field: 'student_name', label: 'Student' }
];