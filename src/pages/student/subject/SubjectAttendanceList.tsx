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
        <div className="bg-slate-50 dark:bg-zinc-800/60 border border-slate-200/80 dark:border-zinc-800 flex flex-col gap-1 p-2.5 sm:p-3 rounded-xl shadow-2xs">
            <span
                className={accent
                    ? 'font-bold text-blue-600 dark:text-blue-400 text-lg sm:text-xl'
                    : 'font-bold text-slate-900 dark:text-slate-100 text-lg sm:text-xl'}
            >
                {value}
            </span>
            <span className="text-slate-500 dark:text-slate-400 text-[11px] sm:text-xs">
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
            <div className="gap-2.5 sm:gap-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
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
                        <div className="border border-slate-200 dark:border-zinc-800 flex flex-col gap-2 items-center justify-center p-8 rounded-2xl text-center bg-slate-50/50 dark:bg-zinc-900/50">
                            <span className="font-semibold text-slate-800 dark:text-slate-200 text-sm">
                                No attendance records yet
                            </span>
                            <span className="text-slate-500 text-xs max-w-sm">
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
