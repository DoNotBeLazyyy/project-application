import { CommonBadgeStatus } from '@components/badge/CommonBadgeStatus';
import CommonTable from '@components/table/CommonTable';
import {
    CalendarBlankIcon,
    CalendarCheckIcon,
    CheckCircleIcon,
    ClockIcon,
    SealCheckIcon,
    XCircleIcon
} from '@phosphor-icons/react';
import { AttendanceStatus } from '@type/faculty.type';
import { StudentSubjectAttendanceItem } from '@type/student-portal.type';
import { MobileCardColDef } from '@type/table.type';
import { formatShortDate } from '@utils/date.util';
import { ReactNode, useMemo } from 'react';

const STATUS_VARIANT: Record<AttendanceStatus, 'success' | 'error' | 'warning' | 'info'> = {
    Present: 'success',
    Late: 'warning',
    Absent: 'error',
    Excused: 'info'
};

interface SubjectAttendanceListProps {
    attendance: StudentSubjectAttendanceItem[];
}

interface AttendanceCardProps {
    hint?: string;
    icon: ReactNode;
    iconBg: string;
    iconColor: string;
    label: string;
    value: string | number;
}

function AttendanceCard({ hint, icon, iconBg, iconColor, label, value }: AttendanceCardProps) {
    return (
        <div className="bg-slate-50/70 dark:bg-zinc-800/60 border border-slate-200/80 dark:border-zinc-800 flex items-center gap-3 p-3 sm:p-3.5 rounded-2xl shadow-2xs min-w-0 transition-all">
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconBg}`}>
                <span className={`flex items-center justify-center ${iconColor}`}>
                    {icon}
                </span>
            </div>
            <div className="flex flex-col gap-0.5 min-w-0 text-left">
                <span className="font-bold text-lg sm:text-xl text-slate-900 dark:text-slate-100 truncate tracking-tight">
                    {value}
                </span>
                <span className="font-medium text-xs text-slate-600 dark:text-slate-400 truncate">
                    {label}
                </span>
                {hint && (
                    <span className="text-[11px] text-slate-400 dark:text-zinc-500 truncate">
                        {hint}
                    </span>
                )}
            </div>
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

        return {
            absent, excused, late, present, rate, total
        };
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

    const presentPct = stats.total > 0
        ? (stats.present / stats.total) * 100
        : 0;
    const latePct = stats.total > 0
        ? (stats.late / stats.total) * 100
        : 0;
    const excusedPct = stats.total > 0
        ? (stats.excused / stats.total) * 100
        : 0;
    const absentPct = stats.total > 0
        ? (stats.absent / stats.total) * 100
        : 0;

    return (
        <div className="flex flex-1 flex-col gap-4 min-h-0">
            {/* Metric Summary Cards Grid */}
            <div className="gap-2.5 sm:gap-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
                <AttendanceCard
                    hint="Presence + Late"
                    icon={<CalendarCheckIcon size={22} />}
                    iconBg="bg-blue-50 dark:bg-blue-950/60"
                    iconColor="text-blue-600 dark:text-blue-400"
                    label="Attendance Rate"
                    value={`${stats.rate}%`}
                />
                <AttendanceCard
                    hint="Class meetings"
                    icon={<CalendarBlankIcon size={22} />}
                    iconBg="bg-slate-100 dark:bg-zinc-800"
                    iconColor="text-slate-600 dark:text-slate-300"
                    label="Total Sessions"
                    value={stats.total}
                />
                <AttendanceCard
                    hint="On time"
                    icon={<CheckCircleIcon size={22} />}
                    iconBg="bg-emerald-50 dark:bg-emerald-950/60"
                    iconColor="text-emerald-600 dark:text-emerald-400"
                    label="Present"
                    value={stats.present}
                />
                <AttendanceCard
                    hint="Partial credit"
                    icon={<ClockIcon size={22} />}
                    iconBg="bg-amber-50 dark:bg-amber-950/60"
                    iconColor="text-amber-600 dark:text-amber-400"
                    label="Late"
                    value={stats.late}
                />
                <AttendanceCard
                    hint="Unexcused"
                    icon={<XCircleIcon size={22} />}
                    iconBg="bg-rose-50 dark:bg-rose-950/60"
                    iconColor="text-rose-600 dark:text-rose-400"
                    label="Absent"
                    value={stats.absent}
                />
                <AttendanceCard
                    hint="Official excuse"
                    icon={<SealCheckIcon size={22} />}
                    iconBg="bg-indigo-50 dark:bg-indigo-950/60"
                    iconColor="text-indigo-600 dark:text-indigo-400"
                    label="Excused"
                    value={stats.excused}
                />
            </div>

            {/* Attendance Proportion Meter */}
            {stats.total > 0 && (
                <div className="bg-slate-50 dark:bg-zinc-800/40 border border-slate-200/80 dark:border-zinc-800 p-3.5 rounded-xl flex flex-col gap-2">
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                        <span>Attendance Ratio</span>
                        <span>{stats.rate}% Compliance</span>
                    </div>
                    <div className="h-2.5 w-full bg-slate-200 dark:bg-zinc-700 rounded-full overflow-hidden flex">
                        {presentPct > 0 && (
                            <div
                                className="bg-emerald-500 h-full"
                                style={{ width: `${presentPct}%` }}
                                title={`Present: ${stats.present}`}
                            />
                        )}
                        {latePct > 0 && (
                            <div
                                className="bg-amber-500 h-full"
                                style={{ width: `${latePct}%` }}
                                title={`Late: ${stats.late}`}
                            />
                        )}
                        {excusedPct > 0 && (
                            <div
                                className="bg-blue-500 h-full"
                                style={{ width: `${excusedPct}%` }}
                                title={`Excused: ${stats.excused}`}
                            />
                        )}
                        {absentPct > 0 && (
                            <div
                                className="bg-rose-500 h-full"
                                style={{ width: `${absentPct}%` }}
                                title={`Absent: ${stats.absent}`}
                            />
                        )}
                    </div>
                </div>
            )}

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