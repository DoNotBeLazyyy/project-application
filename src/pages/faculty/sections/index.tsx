import { CommonBadgeStatus } from '@components/badge/CommonBadgeStatus';
import { SortColumn } from '@components/modal/sort-modal/SortColumnItem';
import CommonTableCard from '@components/table-card/CommonTableCard';
import { SEARCH_HINTS } from '@constants/search-hint.constant';
import { listMySections } from '@services/faculty.service';
import { MySectionListRow } from '@type/faculty.type';
import { SortStringDto } from '@type/http.type';
import { SectionStatus } from '@type/section.type';
import { MobileCardColDef } from '@type/table.type';
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

const SORT_COLUMNS: SortColumn[] = [
    { field: 'section_code', label: 'Section Code' },
    { field: 'course_code', label: 'Course Code' },
    { field: 'course_title', label: 'Course Title' },
    { field: 'term_label', label: 'Term' }
];

const STATUS_VARIANT_MAP: Record<SectionStatus, 'success' | 'error' | 'warning' | 'info'> = {
    Open: 'success',
    Full: 'warning',
    Ongoing: 'info',
    Closed: 'error',
    Cancelled: 'error'
};

export default function FacultySectionManagement() {
    const navigate = useNavigate();

    const columnDefs = useMemo<MobileCardColDef[]>(function() {
        return [
            {
                field: 'section_code',
                flex: 1,
                headerName: 'Section Code',
                mobileCard: 'subtitle',
                sortable: true
            },
            {
                field: 'course_code',
                flex: 1,
                headerName: 'Course Code',
                mobileCard: 'hidden',
                sortable: true
            },
            {
                field: 'course_title',
                flex: 3,
                headerName: 'Course Title',
                mobileCard: 'title',
                sortable: true
            },
            {
                field: 'term_label',
                flex: 2,
                headerName: 'Term',
                sortable: true
            },
            {
                field: 'enrolled_count',
                flex: 1,
                headerName: 'Enrolled',
                sortable: false,
                valueFormatter: (params) => `${params.value} / ${params.data?.max_slots ?? 0}`
            },
            {
                field: 'status',
                flex: 1,
                headerName: 'Status',
                sortable: false,
                cellRenderer: (params: { data: MySectionListRow }) => (
                    <div className="flex h-full items-center">
                        <CommonBadgeStatus
                            label={params.data.status}
                            variant={STATUS_VARIANT_MAP[params.data.status]}
                        />
                    </div>
                )
            }
        ];
    }, []);

    async function fetchSections(
        page: number,
        size: number,
        search: string,
        sort: SortStringDto[]
    ) {
        return listMySections(page, size, search, sort);
    }

    return (
        <div className="flex flex-col gap-4 h-full">
            <CommonTableCard<MySectionListRow>
                cardHeaderProps={{
                    subheader: 'View and manage your assigned sections.',
                    title: 'My Sections'
                }}
                controls={{
                    tableInputProps: {
                        searchHints: SEARCH_HINTS.mySections
                    }
                }}
                sortColumns={SORT_COLUMNS}
                tableProps={{
                    leadingColumnDefs: columnDefs
                }}
                uniqueIdKey="id"
                onFetch={fetchSections}
                onRowClick={function(id) {
                    navigate(`/faculty/sections/${id}`);
                }}
            />
        </div>
    );
}