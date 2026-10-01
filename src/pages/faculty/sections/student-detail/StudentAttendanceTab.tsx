import { CommonBadgeStatus } from '@components/badge/CommonBadgeStatus';
import AttendanceEditModal from '@pages/faculty/sections/student-detail/AttendanceEditModal';
import { attendanceStatusVariant, formatDate } from '@pages/faculty/sections/student-detail/studentDetailFormat';
import { getStudentAttendance } from '@services/faculty.service';
import { StudentAttendanceRow, StudentEvaluationAttendance } from '@type/faculty.type';
import { useEffect, useState } from 'react';

interface StudentAttendanceTabProps {
    enrollmentId: string;
    summary: StudentEvaluationAttendance;
    onChanged: () => void;
}

interface AttendanceStatProps {
    accent?: boolean;
    label: string;
    value: string;
}

function AttendanceStat({ accent, label, value }: AttendanceStatProps) {
    return (
        <div className="bg-slate-50 dark:bg-zinc-800/50 border border-slate-100 dark:border-zinc-800 flex flex-col gap-0.5 p-2.5 rounded-xl text-center">
            <span
                className={accent
                    ? 'font-bold text-blue-600 dark:text-blue-400 text-lg'
                    : 'font-bold text-slate-900 dark:text-slate-100 text-lg'}
            >
                {value}
            </span>
            <span className="text-slate-500 text-[11px]">
                {label}
            </span>
        </div>
    );
}

export default function StudentAttendanceTab({ enrollmentId, summary, onChanged }: StudentAttendanceTabProps) {
    const [rows, setRows] = useState<StudentAttendanceRow[]>([]);
    const [selectedRecord, setSelectedRecord] = useState<StudentAttendanceRow | null>(null);

    async function fetchRows() {
        const result = await getStudentAttendance(enrollmentId);
        if (result.data) {
            setRows(result.data);
        }
    }

    useEffect(function() {
        fetchRows();
    }, [enrollmentId]);

    const rate = summary.recorded > 0
        ? Math.round(((summary.present + summary.late) / summary.recorded) * 100)
        : 0;

    return (
        <div className="flex flex-1 flex-col gap-3 min-h-0">
            <div className="gap-2 grid grid-cols-3 sm:grid-cols-5">
                <AttendanceStat accent label="Attendance Rate" value={`${rate}%`} />
                <AttendanceStat label="Present" value={String(summary.present)} />
                <AttendanceStat label="Late" value={String(summary.late)} />
                <AttendanceStat label="Absent" value={String(summary.absent)} />
                <AttendanceStat label="Excused" value={String(summary.excused)} />
            </div>

            <p className="text-slate-500 text-xs">
                {summary.recorded} of {summary.total_sessions} sessions recorded · click a card to adjust
            </p>

            <div className="flex-1 min-h-0 overflow-y-auto">
                {rows.length === 0 ? (
                    <div className="py-12 text-center text-slate-500 text-xs">
                        No session attendance logged for this student.
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pb-4">
                        {rows.map((row) => (
                            <div
                                key={row.session_id}
                                onClick={() => setSelectedRecord(row)}
                                className="bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 rounded-2xl p-3 shadow-2xs hover:shadow-xs hover:border-blue-400 dark:hover:border-blue-600 transition-all cursor-pointer flex items-center justify-between gap-3"
                            >
                                <div className="flex flex-col min-w-0">
                                    <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                                        {formatDate(row.session_date)}
                                    </span>
                                    <span className="text-xs text-slate-400 truncate mt-0.5">
                                        {row.remarks || 'No notes'}
                                    </span>
                                </div>

                                <CommonBadgeStatus
                                    label={row.status}
                                    variant={attendanceStatusVariant(row.status)}
                                />
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <AttendanceEditModal
                record={selectedRecord}
                onClose={() => setSelectedRecord(null)}
                onSaved={() => {
                    fetchRows();
                    onChanged();
                }}
            />
        </div>
    );
}