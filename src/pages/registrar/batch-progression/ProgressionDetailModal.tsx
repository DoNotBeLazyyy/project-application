import CommonActionModal from '@components/modal/CommonActionModal';
import CommonTable from '@components/table/CommonTable';
import { ProgressionPlannedCourse, ProgressionPreviewRow } from '@type/progression.type';
import { ColDef } from 'ag-grid-community';

const PLANNED_COURSE_COLUMNS: ColDef<ProgressionPlannedCourse>[] = [
    { field: 'course_code', flex: 1, headerName: 'Course', minWidth: 110 },
    { field: 'course_title', flex: 2, headerName: 'Title', minWidth: 200 },
    {
        field: 'total_units',
        flex: 0,
        headerName: 'Units',
        maxWidth: 90,
        minWidth: 90,
        valueFormatter: (params) => Number(params.value)
            .toFixed(1)
    },
    {
        field: 'section_code',
        flex: 1,
        headerName: 'Section',
        minWidth: 120,
        valueFormatter: (params) => params.value ?? '—'
    },
    {
        field: 'issue_message',
        flex: 3,
        headerName: 'Status',
        minWidth: 240,
        valueFormatter: (params) => params.value ?? 'Will be enrolled'
    }
];

interface ProgressionDetailModalProps {
    open: boolean;
    row: ProgressionPreviewRow | null;
    onClose: () => void;
}

export default function ProgressionDetailModal({
    open,
    row,
    onClose
}: ProgressionDetailModalProps) {
    return (
        <CommonActionModal
            cardProps={{
                cardHeaderProps: {
                    subheader: row
                        ? `${row.student_number} — ${row.student_name}`
                        : '',
                    title: 'Progression Detail'
                }
            }}
            containerClassName="max-w-full w-[60rem]"
            formButtonsProps={{
                cancelProps: {
                    children: 'Close',
                    onClick: onClose
                }
            }}
            open={open}
            onClose={onClose}
        >
            <div className="flex flex-col gap-5">
                <div className="bg-(--mui-palette-action-hover) grid grid-cols-2 gap-3 p-4 rounded-lg md:grid-cols-4">
                    <div className="flex flex-col">
                        <span className="text-(--mui-palette-text-secondary) text-xs">Program</span>
                        <span className="font-semibold text-(--mui-palette-text-primary) text-sm">
                            {row?.program_code ?? '—'}
                        </span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-(--mui-palette-text-secondary) text-xs">Current Year</span>
                        <span className="font-semibold text-(--mui-palette-text-primary) text-sm">
                            {row
                                ? `Year ${row.current_year_level}`
                                : '—'}
                        </span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-(--mui-palette-text-secondary) text-xs">Proposed Year</span>
                        <span className="font-semibold text-(--mui-palette-text-primary) text-sm">
                            {row
                                ? `Year ${row.proposed_year_level}`
                                : '—'}
                        </span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-(--mui-palette-text-secondary) text-xs">Subjects To Enroll</span>
                        <span className="font-semibold text-(--mui-palette-text-primary) text-sm">
                            {row?.enrollable_count ?? 0}
                        </span>
                    </div>
                </div>
                {row?.blocker_message && (
                    <p className="text-(--mui-palette-error-main) text-sm">
                        {row.blocker_message}
                    </p>
                )}
                <div className="flex flex-col gap-2">
                    <span className="font-medium text-(--mui-palette-text-primary) text-sm">
                        Curriculum Subjects ({row?.planned_courses.length ?? 0})
                    </span>
                    <div className="h-96">
                        <CommonTable<ProgressionPlannedCourse>
                            leadingColumnDefs={PLANNED_COURSE_COLUMNS}
                            rowData={row?.planned_courses ?? []}
                        />
                    </div>
                </div>
            </div>
        </CommonActionModal>
    );
}