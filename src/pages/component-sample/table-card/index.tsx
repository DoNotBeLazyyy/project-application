import CommonTabMenu from '@components/tab-menu/CommonTabMenu';
import TableCard from '@components/table-card/TableCard';
import TableCardContent from '@components/table-card/TableCardContent';
import TableCardControls from '@components/table-card/TableCardControls';
import TableCardHeader from '@components/table-card/TableCardHeader';
import TableCardPagination from '@components/table-card/TableCardPagination';
import { DEFAULT_PAGINATION } from '@constants/table.constant';
import { Box } from '@mui/material';
import { PaginationData } from '@type/table.type';
import { ColDef } from 'ag-grid-community';
import { SyntheticEvent, useEffect, useMemo, useState } from 'react';

/**
 * TableCardSample
 * * A sample component demonstrating the implementation of the TableCard compound component.
 * * It showcases local state management for pagination, column definitions, and
 * * data slicing for a mock server-side pagination effect.
 */
export default function TableCardSample() {
    const [activeTab, setActiveTab] = useState('employee'); // State for switching between views
    const [pagination, setPagination] = useState<PaginationData>(DEFAULT_PAGINATION); // State managing page, rows, and counts

    /**
     * handleTabChange
     * * Handles the transition between different table views.
     */
    function handleTabChange(_: SyntheticEvent, newValue: string) {
        setActiveTab(newValue);
    }

    // Definition of table columns, specifying fields, headers, and sorting behavior
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

    // Generates a static list of 100 mock faculty records for demonstration
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
        const statuses = [
            'Active',
            'On Leave',
            'Retired',
            'Probationary'
        ];
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

    // Computes the specific subset of data to be displayed based on pagination state
    const displayedData = useMemo(() => {
        const startIndex = (pagination.currentPage - 1) * pagination.rowsPerPage;
        const endIndex = startIndex + pagination.rowsPerPage;

        return allRowData.slice(startIndex, endIndex);
    }, [allRowData, pagination.currentPage, pagination.rowsPerPage]);

    // Synchronizes pagination metadata when source data changes
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
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
                height: '100%'
            }}
        >
            <CommonTabMenu
                tabs={[
                    {
                        label: 'Employee',
                        value: 'employee'
                    },
                    {
                        label: 'Admin',
                        value: 'admin'
                    }
                ]}
                value={activeTab}
                onChange={handleTabChange}
            />
            <TableCard
                sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    flex: 1,
                    minHeight: 0
                }}
            >
                <TableCardHeader
                    subheader={
                        activeTab === 'employee'
                            ? 'Employee View Subheader'
                            : 'Admin View Subheader'
                    }
                    title={
                        activeTab === 'employee'
                            ? 'Employee View'
                            : 'Admin View'
                    }
                >
                    <TableCardControls allowCreate={activeTab === 'admin'} />
                </TableCardHeader>
                <TableCardContent
                    leadingColumnDefs={columnDefs}
                    rowData={displayedData}
                />
                <TableCardPagination
                    pagination={pagination}
                    onSetPagination={setPagination}
                />
            </TableCard>
        </Box>
    );
}