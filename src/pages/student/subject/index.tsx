import { CommonBadgeStatus } from '@components/badge/CommonBadgeStatus';
import { SortColumn } from '@components/modal/sort-modal/SortColumnItem';
import CommonTableCard from '@components/table-card/CommonTableCard';
import { listStudentSubjects } from '@services/student-portal.service';
import { EnrollmentStatus } from '@type/enrollment.type';
import { SortStringDto } from '@type/http.type';
import { MySubjectListRow } from '@type/student-portal.type';
import { ColDef } from 'ag-grid-community';
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

const SORT_COLUMNS: SortColumn[] = [
    { field: 'course_code', label: 'Course Code' },
    { field: 'course_title', label: 'Course Title' },
    { field: 'term_label', label: 'Term' },
    { field: 'faculty_name', label: 'Faculty' }
];

const STATUS_VARIANT_MAP: Record<EnrollmentStatus, 'success' | 'error' | 'warning' | 'info'> = {
    Enrolled: 'success',
    Dropped: 'error',
    Withdrawn: 'error',
    Completed: 'info',
    Failed: 'error',
    Incomplete: 'warning'
};

export default function StudentSubjects() {
    const navigate = useNavigate();

    const columnDefs = useMemo<ColDef<MySubjectListRow>[]>(function() {
        return [
            {
                field: 'course_code',
                flex: 1,
                headerName: 'Course Code',
                sortable: true
            },
            {
                field: 'course_title',
                flex: 3,
                headerName: 'Course Title',
                sortable: true
            },
            {
                field: 'section_code',
                flex: 1,
                headerName: 'Section',
                sortable: false
            },
            {
                field: 'term_label',
                flex: 2,
                headerName: 'Term',
                sortable: true
            },
            {
                field: 'faculty_name',
                flex: 2,
                headerName: 'Faculty',
                sortable: true,
                valueFormatter: (params) => params.value ?? '—'
            },
            {
                field: 'lecture_units',
                flex: 1,
                headerName: 'Units',
                sortable: false,
                valueFormatter: (params) => {
                    const lec = params.data?.lecture_units ?? 0;
                    const lab = params.data?.laboratory_units ?? 0;
                    return lab > 0
                        ? `${lec} lec / ${lab} lab`
                        : `${lec}`;
                }
            },
            {
                field: 'enrollment_status',
                flex: 1,
                headerName: 'Status',
                sortable: false,
                cellRenderer: (params: { data: MySubjectListRow }) => (
                    <div className="flex h-full items-center">
                        <CommonBadgeStatus
                            label={params.data.enrollment_status}
                            variant={STATUS_VARIANT_MAP[params.data.enrollment_status]}
                        />
                    </div>
                )
            }
        ];
    }, []);

    async function fetchSubjects(
        page: number,
        size: number,
        search: string,
        sort: SortStringDto[]
    ) {
        return listStudentSubjects(page, size, search, sort);
    }

    return (
        <CommonTableCard<MySubjectListRow>
            cardHeaderProps={{
                subheader: 'All your enrolled subjects.',
                title: 'My Subjects'
            }}
            sortColumns={SORT_COLUMNS}
            tableProps={{
                leadingColumnDefs: columnDefs
            }}
            uniqueIdKey="enrollment_id"
            onFetch={fetchSubjects}
            onRowClick={function(id) {
                navigate(`/student/subjects/${id}`);
            }}
        />
    );
}