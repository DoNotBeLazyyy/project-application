import { CommonBadgeStatus } from '@components/badge/CommonBadgeStatus';
import {
    BookOpenIcon,
    ChalkboardTeacherIcon,
    CheckCircleIcon,
    ClockIcon,
    GraduationCapIcon,
    UserIcon,
    UsersThreeIcon,
    WarningCircleIcon,
    WarningIcon
} from '@phosphor-icons/react';
import { FacultyLoadSection, FacultyScheduleConflict } from '@type/faculty-load.type';
import { parseTimeToMinutes } from '@utils/faculty-load-conflicts.util';
import { useMemo } from 'react';

interface Step1FacultyLoadOverviewProps {
    faculty: {
        id: string;
        faculty_name: string;
        email: string;
    };
    sections: FacultyLoadSection[];
    conflicts: FacultyScheduleConflict[];
    termLabel?: string;
}

const DAYS_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function Step1FacultyLoadOverview({
    faculty,
    sections,
    conflicts,
    termLabel
}: Step1FacultyLoadOverviewProps) {
    const totalUnits = useMemo(() => {
        return sections.reduce((sum, s) => sum + (Number(s.units) || 0), 0);
    }, [sections]);

    const totalLectureUnits = useMemo(() => {
        return sections.reduce((sum, s) => sum + (Number(s.lecture_units) || 0), 0);
    }, [sections]);

    const totalLabUnits = useMemo(() => {
        return sections.reduce((sum, s) => sum + (Number(s.lab_units) || 0), 0);
    }, [sections]);

    const totalEnrolledStudents = useMemo(() => {
        return sections.reduce((sum, s) => sum + (Number(s.enrolled_count) || 0), 0);
    }, [sections]);

    const weeklyHours = useMemo(() => {
        let totalMinutes = 0;
        for (const sec of sections) {
            for (const sch of sec.schedules || []) {
                const start = parseTimeToMinutes(sch.time_start);
                const end = parseTimeToMinutes(sch.time_end);
                if (end > start) {
                    totalMinutes += (end - start);
                }
            }
        }
        return (totalMinutes / 60).toFixed(1);
    }, [sections]);

    // Timetable grouped by day
    const daySchedule = useMemo(() => {
        const map = new Map<string, {
            day: string;
            time_start: string;
            time_end: string;
            startMin: number;
            section_code: string;
            course_code: string;
            course_title: string;
            room?: string;
        }[]>();

        for (const day of DAYS_ORDER) {
            map.set(day, []);
        }

        for (const sec of sections) {
            for (const sch of sec.schedules || []) {
                const dayList = map.get(sch.day_of_week) || [];
                dayList.push({
                    day: sch.day_of_week,
                    time_start: sch.time_start,
                    time_end: sch.time_end,
                    startMin: parseTimeToMinutes(sch.time_start),
                    section_code: sec.section_code,
                    course_code: sec.course_code,
                    course_title: sec.course_title,
                    room: sch.room || sec.room || undefined
                });
                map.set(sch.day_of_week, dayList);
            }
        }

        // Sort each day chronologically
        for (const day of DAYS_ORDER) {
            const list = map.get(day) || [];
            list.sort((a, b) => a.startMin - b.startMin);
            map.set(day, list);
        }

        return map;
    }, [sections]);

    const loadStatus = useMemo(() => {
        if (totalUnits === 0) return { label: 'No Teaching Load', variant: 'info' as const };
        if (totalUnits < 12) return { label: 'Light Load (<12 Units)', variant: 'warning' as const };
        if (totalUnits > 21) return { label: 'Overload (>21 Units)', variant: 'error' as const };
        return { label: 'Standard Full-Time Load', variant: 'success' as const };
    }, [totalUnits]);

    return (
        <div className="flex flex-col gap-5">
            {/* Faculty Identity Banner */}
            <div className="bg-white dark:bg-zinc-800/90 rounded-2xl border border-slate-200 dark:border-zinc-700/80 p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="w-13 h-13 rounded-2xl bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 flex items-center justify-center font-bold text-xl border border-brand-200/50 dark:border-brand-800/40 shrink-0 shadow-inner">
                        <UserIcon className="w-6 h-6" weight="bold" />
                    </div>
                    <div className="flex flex-col">
                        <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-bold text-slate-900 dark:text-slate-100 text-lg leading-tight">
                                {faculty.faculty_name}
                            </h3>
                            <CommonBadgeStatus
                                label={loadStatus.label}
                                variant={loadStatus.variant}
                            />
                        </div>
                        <span className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                            {faculty.email} {termLabel ? `· Term: ${termLabel}` : ''}
                        </span>
                    </div>
                </div>

                {conflicts.length > 0 ? (
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/50 text-rose-700 dark:text-rose-300 text-xs font-semibold">
                        <WarningCircleIcon className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" weight="fill" />
                        <span>{conflicts.length} Schedule Conflict{conflicts.length > 1 ? 's' : ''} Detected</span>
                    </div>
                ) : (
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50 text-emerald-700 dark:text-emerald-300 text-xs font-semibold">
                        <CheckCircleIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" weight="fill" />
                        <span>Schedule Clear</span>
                    </div>
                )}
            </div>

            {/* Bento Statistics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                <div className="bg-white dark:bg-zinc-800/80 p-4 rounded-xl border border-slate-200 dark:border-zinc-700/70 shadow-xs flex flex-col gap-1.5">
                    <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                        <span className="text-xs font-medium">Assigned Sections</span>
                        <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400">
                            <ChalkboardTeacherIcon className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                        {sections.length}
                    </div>
                    <span className="text-[11px] text-slate-400">Course offerings</span>
                </div>

                <div className="bg-white dark:bg-zinc-800/80 p-4 rounded-xl border border-slate-200 dark:border-zinc-700/70 shadow-xs flex flex-col gap-1.5">
                    <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                        <span className="text-xs font-medium">Total Units</span>
                        <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
                            <BookOpenIcon className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                        {totalUnits}
                    </div>
                    <span className="text-[11px] text-slate-400">
                        {totalLectureUnits} Lec · {totalLabUnits} Lab
                    </span>
                </div>

                <div className="bg-white dark:bg-zinc-800/80 p-4 rounded-xl border border-slate-200 dark:border-zinc-700/70 shadow-xs flex flex-col gap-1.5">
                    <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                        <span className="text-xs font-medium">Weekly Hours</span>
                        <div className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400">
                            <ClockIcon className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                        {weeklyHours} <span className="text-xs font-normal text-slate-500">hrs</span>
                    </div>
                    <span className="text-[11px] text-slate-400">Contact teaching time</span>
                </div>

                <div className="bg-white dark:bg-zinc-800/80 p-4 rounded-xl border border-slate-200 dark:border-zinc-700/70 shadow-xs flex flex-col gap-1.5">
                    <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                        <span className="text-xs font-medium">Enrolled Students</span>
                        <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
                            <UsersThreeIcon className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                        {totalEnrolledStudents}
                    </div>
                    <span className="text-[11px] text-slate-400">Active class headcount</span>
                </div>
            </div>

            {/* Weekly Schedule Timetable Breakdown */}
            <div className="bg-white dark:bg-zinc-800/80 rounded-2xl border border-slate-200 dark:border-zinc-700/70 p-5 shadow-xs flex flex-col gap-4">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-700/50 pb-3">
                    <div className="flex items-center gap-2">
                        <ClockIcon className="w-5 h-5 text-brand-600 dark:text-brand-400" weight="bold" />
                        <div>
                            <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                                Weekly Teaching Timetable
                            </h4>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                Schedule distribution by day for assigned course sections.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {DAYS_ORDER.map((day) => {
                        const slots = daySchedule.get(day) || [];
                        const hasClasses = slots.length > 0;

                        return (
                            <div
                                key={day}
                                className={`rounded-xl border p-3 flex flex-col gap-2 transition-all ${
                                    hasClasses
                                        ? 'border-blue-200/80 dark:border-blue-900/60 bg-blue-50/20 dark:bg-blue-950/10'
                                        : 'border-slate-100 dark:border-zinc-800 bg-slate-50/40 dark:bg-zinc-900/30'
                                }`}
                            >
                                <div className="flex items-center justify-between">
                                    <span className={`text-xs font-bold ${
                                        hasClasses ? 'text-blue-900 dark:text-blue-200' : 'text-slate-400'
                                    }`}>
                                        {day}
                                    </span>
                                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                                        hasClasses
                                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300'
                                            : 'bg-slate-100 text-slate-400 dark:bg-zinc-800 dark:text-zinc-500'
                                    }`}>
                                        {slots.length} {slots.length === 1 ? 'class' : 'classes'}
                                    </span>
                                </div>

                                {slots.length === 0 ? (
                                    <div className="text-[11px] text-slate-400 italic py-2">
                                        No scheduled sessions
                                    </div>
                                ) : (
                                    <div className="flex flex-col gap-2 pt-1">
                                        {slots.map((s, idx) => (
                                            <div
                                                key={`${day}-${idx}`}
                                                className="bg-white dark:bg-zinc-800 p-2.5 rounded-lg border border-slate-200/70 dark:border-zinc-700/60 shadow-2xs flex flex-col gap-1 text-xs"
                                            >
                                                <div className="flex items-center justify-between gap-1 font-semibold text-slate-900 dark:text-slate-100">
                                                    <span className="truncate">{s.course_code} ({s.section_code})</span>
                                                    <span className="text-[10px] text-blue-600 dark:text-blue-400 shrink-0 font-medium">
                                                        {s.time_start} - {s.time_end}
                                                    </span>
                                                </div>
                                                <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                                                    <span className="truncate">{s.course_title}</span>
                                                    {s.room && (
                                                        <span className="bg-slate-100 dark:bg-zinc-700/70 px-1.5 py-0.5 rounded text-[10px] shrink-0 font-medium">
                                                            {s.room}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
