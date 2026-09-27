import { CommonBadgeStatus } from '@components/badge/CommonBadgeStatus';
import CommonTable from '@components/table/CommonTable';
import { AttendanceStatus } from '@type/faculty.type';
import { StudentSubjectAttendanceItem } from '@type/student-portal.type';
import { MobileCardColDef } from '@type/table.type';
import { formatShortDate } from '@utils/date.util';
import { useMemo } from 'react';

const STATUS_VARIANT: Record<AttendanceStatus, 'success' | 'error' | 'warning' | 'info'> = {
    Present: 'success',
    Late: 'warning',
    Absent: 'error',
    Excused: 'info'
};

interface SubjectAttendanceListProps {
    attendance: StudentSubjectAttendanceItem[];
}

interface StatTileProps {
    accent?: boolean;
    label: string;
    value: string | number;
}

function StatTile({ accent, label, value }: StatTileProps) {
    return (
        <div className="bg-(--mui-palette-action-hover) flex flex-col gap-1 p-3 rounded-lg">
            <span
                className={accent
                    ? 'font-semibold text-(--mui-palette-primary-main) text-xl'
                    : 'font-semibold text-(--mui-palette-text-primary) text-xl'}
            >
                {value}
            </span>
            <span className="text-(--mui-palette-text-secondary) text-xs">
                {label}
            </span>
        </div>
    );
}

export default function SubjectAttendanceList({ attendance }: SubjectAttendanceListProps) {
    const stats = useMemo(function() {
        const total = attendance.length;
        const present = attendance.filter((item) => item.status === 'Present').length;
        const late = attendance.filter((item) => item.status === 'Late').length;
        const absent = attendance.filter((item) => item.status === 'Absent').length;
        const excused = attendance.filter((item) => item.status === 'Excused').length;
        const rate = total > 0
            ? Math.round(((present + late) / total) * 100)
            : 100;

        return { absent, excused, late, present, rate, total };
    }, [attendance]);

    const columnDefs = useMemo<MobileCardColDef[]>(function() {
        return [
            {
                field: 'session_date',
                flex: 2,
                headerName: 'Date',
                mobileCard: 'title',
                sortable: false,
                valueFormatter: (params) => formatShortDate(params.value)
            },
            {
                field: 'status',
                flex: 1,
                headerName: 'Status',
                mobileCard: 'subtitle',
                sortable: false,
                cellRenderer: (params: { data: StudentSubjectAttendanceItem }) => (
                    <div className="flex h-full items-center">
                        <CommonBadgeStatus
                            label={params.data.status}
                            variant={STATUS_VARIANT[params.data.status]}
                        />
                    </div>
                )
            },
            {
                field: 'notes',
                flex: 3,
                headerName: 'Session Topic / Notes',
                mobileCard: 'meta',
                sortable: false,
                valueFormatter: (params) => params.value || '—'
            },
            {
                field: 'remarks',
                flex: 2,
                headerName: 'Remarks',
                mobileCard: 'hidden',
                sortable: false,
                valueFormatter: (params) => params.value || '—'
            }
        ];
    }, []);

    return (
        <div className="flex flex-1 flex-col gap-4 min-h-0">
            <div className="gap-3 grid grid-cols-2 sm:grid-cols-6">
                <StatTile
                    accent
                    label="Attendance Rate"
                    value={`${stats.rate}%`}
                />
                <StatTile
                    label="Total Sessions"
                    value={stats.total}
                />
                <StatTile
                    label="Present"
                    value={stats.present}
                />
                <StatTile
                    label="Late"
                    value={stats.late}
                />
                <StatTile
                    label="Absent"
                    value={stats.absent}
                />
                <StatTile
                    label="Excused"
                    value={stats.excused}
                />
            </div>

            <div className="flex-1 min-h-0">
                {attendance.length === 0
                    ? (
                        <div className="border border-(--mui-palette-divider) flex flex-col gap-2 items-center justify-center p-8 rounded-lg text-center">
                            <span className="font-medium text-(--mui-palette-text-primary) text-sm">
                                No attendance records yet
                            </span>
                            <span className="text-(--mui-palette-text-secondary) text-xs">
                                Attendance records will appear here as your instructor logs classroom sessions.
                            </span>
                        </div>
                    )
                    : (
                        <CommonTable<StudentSubjectAttendanceItem>
                            leadingColumnDefs={columnDefs}
                            rowData={attendance}
                        />
                    )}
            </div>
        </div>
    );
}