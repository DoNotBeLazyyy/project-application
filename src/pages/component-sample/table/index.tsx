import CommonTable from '@components/table/CommonTable';
import { ColDef } from 'ag-grid-community';
import { useMemo } from 'react';

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
    const columnDefs: ColDef[] = [
        { field: 'id', headerName: 'ID', flex: 1, sortable: true },
        { field: 'name', headerName: 'Faculty Name', flex: 2, sortable: true },
        { field: 'department', headerName: 'Department', flex: 2, sortable: true },
        { field: 'status', headerName: 'Status', flex: 1, sortable: true }
    ];
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

        return Array.from({ length: 10 }, (_, index) => ({
            id: index + 1,
            name: names[index % names.length],
            department: departments[index % departments.length],
            status: statuses[index % statuses.length]
        }));
    }, []);

    return (
        <div className="bg-[#FFFFFF] h-full w-full p-[20px]">
            <CommonTable
                leadingColumnDefs={columnDefs}
                rowData={allRowData}
            />
        </div>
    );
}