import CommonButton from '@components/button/CommonButton';
import {
    ArrowSquareOutIcon,
    CalendarBlankIcon,
    CheckCircleIcon,
    ClockIcon,
    WarningCircleIcon,
    WarningIcon
} from '@phosphor-icons/react';
import { FacultyScheduleConflict } from '@type/faculty-load.type';
import { useNavigate } from 'react-router-dom';

interface Step3FacultyLoadConflictsProps {
    conflicts: FacultyScheduleConflict[];
    facultyName: string;
    onNavigateToSectionManagement?: () => void;
}

export default function Step3FacultyLoadConflicts({
    conflicts,
    facultyName,
    onNavigateToSectionManagement
}: Step3FacultyLoadConflictsProps) {
    const navigate = useNavigate();

    function handleOpenSection(sectionId: string) {
        if (onNavigateToSectionManagement) {
            onNavigateToSectionManagement();
        }
        navigate(`/dean/section-management?editSectionId=${sectionId}`);
    }

    return (
        <div className="flex flex-col gap-4">
            {/* Header info */}
            <div className="bg-white dark:bg-zinc-800/80 p-4 rounded-xl border border-slate-200 dark:border-zinc-700/70 shadow-xs flex flex-col gap-1">
                <div className="flex items-center gap-2">
                    <WarningIcon className="w-5 h-5 text-amber-500" weight="bold" />
                    <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                        Schedule Conflict Analysis
                    </h3>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                    Schedule overlaps across assigned class sections and classroom facilities for {facultyName}.
                </p>
            </div>

            {/* Zero Conflicts State */}
            {conflicts.length === 0
                ? (
                    <div className="bg-white dark:bg-zinc-800/80 rounded-2xl border border-emerald-200 dark:border-emerald-800/60 p-8 sm:p-12 shadow-xs flex flex-col items-center justify-center text-center gap-3">
                        <div className="w-14 h-14 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-200/60 dark:border-emerald-800/40 shadow-xs">
                            <CheckCircleIcon className="w-8 h-8" weight="fill" />
                        </div>
                        <div className="flex flex-col gap-1 max-w-md">
                            <h4 className="font-bold text-base text-slate-900 dark:text-slate-100">
                                No Schedule Conflicts Detected
                            </h4>
                            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                                All meeting times and venue rooms for this faculty member&apos;s teaching load are compatible and free of time collisions.
                            </p>
                        </div>
                    </div>
                )
                : (
                    <div className="flex flex-col gap-3">
                        {/* Alert Banner */}
                        <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 rounded-xl p-4 flex items-start gap-3">
                            <WarningCircleIcon className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" weight="fill" />
                            <div className="flex flex-col gap-1">
                                <span className="font-bold text-sm text-rose-900 dark:text-rose-200">
                                    {conflicts.length} Overlapping Schedule Conflict{conflicts.length > 1
                                        ? 's'
                                        : ''} Found
                                </span>
                                <p className="text-xs text-rose-700 dark:text-rose-300 leading-relaxed">
                                Overlapping schedules indicate that an instructor has multiple simultaneous classes or that sections share a classroom at the same time. You can reassign sections in Step 2, or edit the section schedules in Section Management.
                                </p>
                            </div>
                        </div>

                        {/* Conflict Cards */}
                        {conflicts.map((conflict, idx) => (
                            <div
                                className="bg-white dark:bg-zinc-800/90 rounded-2xl border border-rose-200 dark:border-rose-900/60 p-4 sm:p-5 shadow-xs flex flex-col gap-3"
                                key={conflict.id || `conflict-${idx}`}
                            >
                                {/* Card Top: Type & Overlap Time */}
                                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-zinc-700/60 pb-3">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-bold px-2.5 py-1 rounded-md bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-200 border border-rose-200 dark:border-rose-800">
                                            {conflict.conflict_type === 'Room'
                                                ? 'Room Overlap'
                                                : 'Faculty Overlap'}
                                        </span>
                                        <span className="font-bold text-sm text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                                            <CalendarBlankIcon className="w-4 h-4 text-blue-500" />
                                            {conflict.day_of_week}
                                        </span>
                                    </div>

                                    <div className="flex items-center gap-2 text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-2.5 py-1 rounded-lg border border-rose-200/60 dark:border-rose-800/50">
                                        <ClockIcon className="w-3.5 h-3.5" />
                                        <span>Overlap: {conflict.overlap_start} – {conflict.overlap_end}</span>
                                    </div>
                                </div>

                                {/* Conflicting Entities */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {/* Section A */}
                                    <div className="bg-slate-50 dark:bg-zinc-900/40 p-3.5 rounded-xl border border-slate-200 dark:border-zinc-700/60 flex flex-col justify-between gap-2">
                                        <div className="flex flex-col gap-1">
                                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                            First Conflicting Section
                                            </span>
                                            <div className="font-bold text-sm text-slate-900 dark:text-slate-100">
                                                {conflict.section_a}
                                            </div>
                                            <span className="text-xs text-slate-600 dark:text-slate-300">
                                                {conflict.course_a || 'Course details'}
                                            </span>
                                            {conflict.room && (
                                                <span className="text-[11px] text-slate-500 font-medium">
                                                Venue: {conflict.room}
                                                </span>
                                            )}
                                        </div>

                                        {conflict.section_a_id && (
                                            <div className="pt-2 border-t border-slate-200/60 dark:border-zinc-800">
                                                <CommonButton
                                                    color="inherit"
                                                    size="small"
                                                    startIcon={<ArrowSquareOutIcon className="w-3.5 h-3.5 text-blue-600" />}
                                                    variant="outlined"
                                                    onClick={() => handleOpenSection(conflict.section_a_id)}
                                                >
                                                Edit Section in Management
                                                </CommonButton>
                                            </div>
                                        )}
                                    </div>

                                    {/* Section B */}
                                    <div className="bg-slate-50 dark:bg-zinc-900/40 p-3.5 rounded-xl border border-slate-200 dark:border-zinc-700/60 flex flex-col justify-between gap-2">
                                        <div className="flex flex-col gap-1">
                                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                            Second Conflicting Section
                                            </span>
                                            <div className="font-bold text-sm text-slate-900 dark:text-slate-100">
                                                {conflict.section_b}
                                            </div>
                                            <span className="text-xs text-slate-600 dark:text-slate-300">
                                                {conflict.course_b || 'Course details'}
                                            </span>
                                            {conflict.room && (
                                                <span className="text-[11px] text-slate-500 font-medium">
                                                Venue: {conflict.room}
                                                </span>
                                            )}
                                        </div>

                                        {conflict.section_b_id && (
                                            <div className="pt-2 border-t border-slate-200/60 dark:border-zinc-800">
                                                <CommonButton
                                                    color="inherit"
                                                    size="small"
                                                    startIcon={<ArrowSquareOutIcon className="w-3.5 h-3.5 text-blue-600" />}
                                                    variant="outlined"
                                                    onClick={() => handleOpenSection(conflict.section_b_id)}
                                                >
                                                Edit Section in Management
                                                </CommonButton>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
        </div>
    );
}