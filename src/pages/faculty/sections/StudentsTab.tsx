import { SortColumn } from '@components/modal/sort-modal/SortColumnItem';
import CommonTableCard from '@components/table-card/CommonTableCard';
import { listSectionStudents } from '@services/faculty.service';
import { SectionStudent } from '@type/faculty.type';
import { SortStringDto } from '@type/http.type';
import { ColDef } from 'ag-grid-community';
import { useMemo } from 'react';

const SORT_COLUMNS: SortColumn[] = [
    { field: 'student_number', label: 'Student No.' },
    { field: 'full_name', label: 'Full Name' },
    { field: 'email', label: 'Email' },
    { field: 'year_level', label: 'Year Level' },
    { field: 'enrolled_at', label: 'Enrolled At' }
];

interface StudentsTabProps {
    sectionId: string;
}

export default function StudentsTab({ sectionId }: StudentsTabProps) {
    const columnDefs = useMemo<ColDef<SectionStudent>[]>(function() {
        return [
            {
                field: 'student_number',
                flex: 1,
                headerName: 'Student No.',
                sortable: true
            },
            {
                field: 'full_name',
                flex: 2,
                headerName: 'Full Name',
                sortable: true
            },
            {
                field: 'email',
                flex: 3,
                headerName: 'Email',
                sortable: true
            },
            {
                field: 'year_level',
                flex: 1,
                headerName: 'Year Level',
                sortable: true
            },
            {
                field: 'status',
                flex: 1,
                headerName: 'Status',
                sortable: false
            },
            {
                field: 'enrolled_at',
                flex: 2,
                headerName: 'Enrolled At',
                sortable: true,
                valueFormatter: (params) => params.value
                    ? new Date(params.value)
                        .toLocaleDateString()
                    : '—'
            }
        ];
    }, []);

    async function fetchStudents(
        page: number,
        size: number,
        search: string,
        sort: SortStringDto[]
    ) {
        return listSectionStudents(sectionId, page, size, search, sort);
    }

    return (
        <CommonTableCard<SectionStudent>
            cardHeaderProps={{
                subheader: 'Students enrolled in this section.',
                title: 'Roster'
            }}
            sortColumns={SORT_COLUMNS}
            tableProps={{
                leadingColumnDefs: columnDefs
            }}
            uniqueIdKey="enrollment_id"
            onFetch={fetchStudents}
        />
    );
}