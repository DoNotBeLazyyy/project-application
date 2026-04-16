import TableCard from '@components/table-card/TableCard';
import { DEFAULT_PAGINATION } from '@constants/table.constant';
import { PaginationData } from '@type/table.type';
import { ColDef } from 'ag-grid-community';
import { useEffect, useMemo, useState } from 'react';

/**
 * TableCardSample
 *
 * A sample component demonstrating the implementation of the TableCard compound component.
 * It showcases local state management for pagination, column definitions, and
 * data slicing for a mock server-side pagination effect.
 *
 * @example
 * <TableCardSample />
 */
export default function TableCardSample() {
    /** State object managing the current page, rows per page, and total record counts. */
    const [pagination, setPagination] = useState<PaginationData>(DEFAULT_PAGINATION);

    /** Definition of table columns, specifying fields, headers, and sorting behavior. */
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
    ];

    /** Generates a static list of 100 mock faculty records for demonstration. */
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
    }, []);

    /** Computes the specific subset of data to be displayed based on pagination state. */
    const displayedData = useMemo(() => {
        const startIndex = (pagination.currentPage - 1) * pagination.rowsPerPage;
        const endIndex = startIndex + pagination.rowsPerPage;

        return allRowData.slice(startIndex, endIndex);
    }, [allRowData, pagination.currentPage, pagination.rowsPerPage]);

    /** Synchronizes pagination metadata (total elements and pages) when source data changes. */
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
        <TableCard>
            <TableCard.Header>
                <TableCard.Title>Table Title</TableCard.Title>
                <TableCard.Description>Table Description</TableCard.Description>
                <TableCard.Controls allowCreate />
            </TableCard.Header>
            <TableCard.Content
                leadingColumnDefs={columnDefs}
                rowData={displayedData}
            />
            <TableCard.Pagination
                pagination={pagination}
                onSetPagination={setPagination}
            />
        </TableCard>
    );
}