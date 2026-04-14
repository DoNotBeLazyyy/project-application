import CommonPagination from '@components/pagination/CommonPagination';
import CommonTable from '@components/table/CommonTable';
import { DEFAULT_PAGINATION } from '@constants/table.constant';
import { PaginationData } from '@type/table.type';
import { ColDef } from 'ag-grid-community';
import { useEffect, useMemo, useState } from 'react';

/**
 * CommonTableSample
 *
 * A demonstration page that renders the CommonTable with mock data
 * and a working local pagination flow.
 *
 * @example
 * <CommonTableSample />
 */
export default function CommonTableSample() {
    const [pagination, setPagination] = useState<PaginationData>(DEFAULT_PAGINATION); // Pagination state
    const columnDefs: ColDef[] = [
        {
            field: 'id',
            flex: 1,
            headerName: 'ID',
            sortable: true
        },
        {
            field: 'name',
            flex: 2,
            headerName: 'Faculty Name',
            sortable: true
        },
        {
            field: 'department',
            flex: 2,
            headerName: 'Department',
            sortable: true
        },
        {
            field: 'status',
            flex: 1,
            headerName: 'Status',
            sortable: true
        }
    ]; // Column definition
    const allRowData = useMemo(() => {
        const departments = [
            'Computer Science',
            'Mathematics',
            'Physics',
            'Engineering',
            'Biology',
            'Chemistry',
            'Architecture',
            'Education'
        ];
        const statuses = ['Active', 'On Leave', 'Retired', 'Probationary'];
        const names = [
            'Dr. Smith',
            'Prof. Jones',
            'Dr. Taylor',
            'Prof. White',
            'Dr. Brown',
            'Prof. Garcia',
            'Dr. Wilson',
            'Prof. Martinez',
            'Dr. Anderson',
            'Prof. Thomas'
        ];

        return Array.from({ length: 100 }, (_, index) => ({
            department: departments[index % departments.length],
            id: index + 1,
            name: names[index % names.length],
            status: statuses[index % statuses.length]
        }));
    }, []); // Dummy row data list
    const displayedData = useMemo(() => {
        const startIndex = (pagination.currentPage - 1) * pagination.rowsPerPage;
        const endIndex = startIndex + pagination.rowsPerPage;

        return allRowData.slice(startIndex, endIndex);
    }, [allRowData, pagination.currentPage, pagination.rowsPerPage]); // Dummy displayed data list

    useEffect(() => {
        const totalElements = allRowData.length;
        const totalPages = Math.ceil(totalElements / pagination.rowsPerPage);

        if (pagination.totalElements !== totalElements || pagination.totalPages !== totalPages) {
            setPagination((prev) => ({
                ...prev,
                totalElements,
                totalPages
            }));
        }
    }, [allRowData.length, pagination.rowsPerPage, pagination.totalElements, pagination.totalPages]);

    return (
        <div className="bg-[var(--mui-tokens-color-common-white)] flex flex-col h-[calc(100%-4rem)] p-[var(--mui-tokens-spacing-6)] w-full">
            <CommonTable
                containerClassName="flex-1 min-h-0"
                leadingColumnDefs={columnDefs}
                rowData={displayedData}
            />
            <CommonPagination
                className="flex h-[4.25rem] items-center"
                pagination={pagination}
                onSetPagination={setPagination}
            />
        </div>
    );
}