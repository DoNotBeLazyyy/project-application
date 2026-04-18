import { SortColumn } from '@components/modal/sort-modal/SortColumnItem';
import { CommonSelectOption } from '@components/select/CommonSelect';

export const STATUS_OPTIONS: CommonSelectOption[] = [
    { label: 'All Statuses', value: 'All' },
    { label: 'Active', value: 'Active' },
    { label: 'Invited', value: 'Invited' }
];

export const CREATE_FORM_ID = 'create-user-form';

export const FILTER_FORM_ID = 'filter-user-form';

export const SORT_COLUMNS: SortColumn[] = [
    { field: 'first_name', label: 'First Name' },
    { field: 'last_name', label: 'Last Name' },
    { field: 'email', label: 'Email' },
    { field: 'role_code', label: 'Role' },
    { field: 'status', label: 'Status' }
];