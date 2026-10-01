import CommonButton from '@components/button/CommonButton';
import {
    ArrowLeftIcon,
    CheckCircleIcon,
    FloppyDiskIcon,
    MagnifyingGlassIcon,
    UserCircleIcon
} from '@phosphor-icons/react';
import { AttendanceRecord, AttendanceRecordUpdate, AttendanceSession, AttendanceStatus } from '@type/faculty.type';
import { useMemo, useState } from 'react';

const STATUSES: AttendanceStatus[] = ['Present', 'Late', 'Absent', 'Excused'];

const STATUS_BUTTON_STYLES: Record<AttendanceStatus, { active: string; idle: string; label: string }> = {
    Present: {
        active: 'bg-emerald-600 text-white border-emerald-600 shadow-xs font-bold',
        idle: 'bg-white dark:bg-zinc-800 text-emerald-700 dark:text-emerald-400 border-slate-200 dark:border-zinc-700 hover:border-emerald-300 dark:hover:border-emerald-700',
        label: 'Present'
    },
    Late: {
        active: 'bg-amber-500 text-white border-amber-500 shadow-xs font-bold',
        idle: 'bg-white dark:bg-zinc-800 text-amber-700 dark:text-amber-400 border-slate-200 dark:border-zinc-700 hover:border-amber-300 dark:hover:border-amber-700',
        label: 'Late'
    },
    Absent: {
        active: 'bg-rose-600 text-white border-rose-600 shadow-xs font-bold',
        idle: 'bg-white dark:bg-zinc-800 text-rose-700 dark:text-rose-400 border-slate-200 dark:border-zinc-700 hover:border-rose-300 dark:hover:border-rose-700',
        label: 'Absent'
    },
    Excused: {
        active: 'bg-blue-600 text-white border-blue-600 shadow-xs font-bold',
        idle: 'bg-white dark:bg-zinc-800 text-blue-700 dark:text-blue-400 border-slate-200 dark:border-zinc-700 hover:border-blue-300 dark:hover:border-blue-700',
        label: 'Excused'
    }
};

interface AttendanceRecordListProps {
    draftRecords: AttendanceRecordUpdate[];
    isDirty: boolean;
    records: AttendanceRecord[];
    selectedSession: AttendanceSession;
    onBackToSessions?: () => void;
    onMarkAllPresent?: () => void;
    onSave: () => Promise<void>;
    onStatusChange: (recordId: string, status: AttendanceStatus) => void;
}

export default function AttendanceRecordList({
    draftRecords,
    isDirty,
    records,
    selectedSession,
    onBackToSessions,
    onMarkAllPresent,
    onSave,
    onStatusChange
}: AttendanceRecordListProps) {
    const [searchQuery, setSearchQuery] = useState('');

    const formattedSessionDate = new Date(selectedSession.session_date).toLocaleDateString(undefined, {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    const presentCount = draftRecords.filter((r) => r.status === 'Present').length;
    const lateCount = draftRecords.filter((r) => r.status === 'Late').length;
    const absentCount = draftRecords.filter((r) => r.status === 'Absent').length;
    const excusedCount = draftRecords.filter((r) => r.status === 'Excused').length;

    const filteredRecords = useMemo(() => {
        if (!searchQuery.trim()) return draftRecords;
        const q = searchQuery.toLowerCase();
        return draftRecords.filter((r) => {
            const meta = records.find((item) => item.id === r.id);
            const name = (meta?.full_name ?? '').toLowerCase();
            const studentNo = (meta?.student_number ?? '').toLowerCase();
            return name.includes(q) || studentNo.includes(q);
        });
    }, [draftRecords, records, searchQuery]);

    return (
        <div className="flex flex-col flex-1 gap-3.5 min-w-0 h-full">
            {/* Header Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-zinc-900 p-3 sm:p-4 rounded-2xl border border-slate-200/90 dark:border-zinc-800 shadow-2xs">
                <div className="flex items-center gap-2.5 min-w-0">
                    {onBackToSessions && (
                        <button
                            type="button"
                            onClick={onBackToSessions}
                            className="p-1.5 md:hidden text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors shrink-0"
                            title="Back to Sessions"
                        >
                            <ArrowLeftIcon size={18} weight="bold" />
                        </button>
                    )}
                    <div className="flex flex-col min-w-0">
                        <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm sm:text-base leading-snug truncate">
                            {formattedSessionDate}
                        </h3>
                        <div className="flex flex-wrap gap-2 text-xs text-slate-500 mt-0.5">
                            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                                {presentCount} Present
                            </span>
                            <span>•</span>
                            <span className="text-amber-600 dark:text-amber-400 font-semibold">
                                {lateCount} Late
                            </span>
                            <span>•</span>
                            <span className="text-rose-600 dark:text-rose-400 font-semibold">
                                {absentCount} Absent
                            </span>
                            <span>•</span>
                            <span className="text-blue-600 dark:text-blue-400 font-semibold">
                                {excusedCount} Excused
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
                    {onMarkAllPresent && (
                        <CommonButton
                            color="inherit"
                            disabled={draftRecords.length === 0}
                            size="small"
                            startIcon={<CheckCircleIcon size={14} weight="bold" />}
                            variant="outlined"
                            onClick={onMarkAllPresent}
                        >
                            Mark All Present
                        </CommonButton>
                    )}
                    <CommonButton
                        color="primary"
                        disabled={!isDirty}
                        size="small"
                        startIcon={<FloppyDiskIcon size={14} weight="bold" />}
                        variant="contained"
                        onClick={onSave}
                    >
                        Save Attendance
                    </CommonButton>
                </div>
            </div>

            {/* Quick Search */}
            <div className="relative">
                <MagnifyingGlassIcon
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                    size={16}
                />
                <input
                    type="text"
                    placeholder="Search student by name or student number..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                />
            </div>

            {/* Bento Cards Grid for Student Attendance Records */}
            <div className="flex-1 min-h-0 overflow-y-auto">
                {filteredRecords.length === 0 ? (
                    <div className="py-12 text-center text-slate-500 text-xs">
                        No students match &ldquo;{searchQuery}&rdquo;.
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 pb-6">
                        {filteredRecords.map((draft) => {
                            const meta = records.find((r) => r.id === draft.id);
                            const fullName = meta?.full_name ?? '—';
                            const studentNo = meta?.student_number ?? '—';

                            return (
                                <div
                                    key={draft.id}
                                    className="bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 rounded-2xl p-3.5 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between gap-3"
                                >
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-2.5 min-w-0">
                                            <div className="w-9 h-9 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-slate-300 font-bold text-xs flex items-center justify-center shrink-0">
                                                {fullName
                                                    .split(' ')
                                                    .map((n) => n[0])
                                                    .slice(0, 2)
                                                    .join('') || <UserCircleIcon size={20} />}
                                            </div>
                                            <div className="flex flex-col min-w-0">
                                                <span className="font-bold text-slate-900 dark:text-slate-100 text-sm truncate leading-snug">
                                                    {fullName}
                                                </span>
                                                <span className="text-[11px] font-mono text-slate-400">
                                                    {studentNo}
                                                </span>
                                            </div>
                                        </div>

                                        <span
                                            className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border shrink-0 ${
                                                draft.status === 'Present'
                                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300'
                                                    : draft.status === 'Late'
                                                    ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300'
                                                    : draft.status === 'Absent'
                                                    ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300'
                                                    : 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300'
                                            }`}
                                        >
                                            {draft.status}
                                        </span>
                                    </div>

                                    {/* Tactile 1-Tap Status Selector Buttons */}
                                    <div className="grid grid-cols-4 gap-1.5 pt-1">
                                        {STATUSES.map((status) => {
                                            const isCurrent = draft.status === status;
                                            const styles = STATUS_BUTTON_STYLES[status];

                                            return (
                                                <button
                                                    key={status}
                                                    type="button"
                                                    onClick={() => onStatusChange(draft.id, status)}
                                                    className={`py-1.5 px-2 rounded-xl text-xs border transition-all cursor-pointer text-center select-none active:scale-95 ${
                                                        isCurrent ? styles.active : styles.idle
                                                    }`}
                                                >
                                                    {styles.label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}