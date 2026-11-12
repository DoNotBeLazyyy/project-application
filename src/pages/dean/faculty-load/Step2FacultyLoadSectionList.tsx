import { CommonBadgeStatus } from '@components/badge/CommonBadgeStatus';
import CommonButton from '@components/button/CommonButton';
import { SECTION_STATUS_VARIANT } from '@constants/status-badge.constant';
import {
    ArrowSquareOutIcon,
    BuildingsIcon,
    CalendarCheckIcon,
    ChalkboardTeacherIcon,
    GraduationCapIcon
} from '@phosphor-icons/react';
import { FacultyLoadSection } from '@type/faculty-load.type';
import { useNavigate } from 'react-router-dom';

interface Step2FacultyLoadSectionListProps {
    sections: FacultyLoadSection[];
    facultyName: string;
    onNavigateToSectionManagement?: VoidFunction;
}

export default function Step2FacultyLoadSectionList({
    sections,
    facultyName,
    onNavigateToSectionManagement
}: Step2FacultyLoadSectionListProps) {
    const navigate = useNavigate();

    function handleGoToSectionManagement(sectionId: string) {
        if (onNavigateToSectionManagement) {
            onNavigateToSectionManagement();
        }
        navigate(`/dean/section-management?editSectionId=${sectionId}`);
    }

    return (
        <div className="flex flex-col gap-4">
            {/* Header with Assigned Sections count */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-zinc-800/80 p-4 rounded-xl border border-slate-200 dark:border-zinc-700/70 shadow-xs">
                <div>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                        <ChalkboardTeacherIcon
                            className="w-5 h-5 text-brand-600 dark:text-brand-400"
                            weight="bold"
                        />
                        <span>Assigned Section Offerings</span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-zinc-700 text-slate-600 dark:text-slate-300 font-semibold">
                            {sections.length}
                        </span>
                    </h3>
                </div>
            </div>

            {/* Empty State */}
            {sections.length === 0 && (
                <div className="flex flex-col items-center justify-center p-12 bg-white dark:bg-zinc-800/60 rounded-2xl border border-dashed border-slate-300 dark:border-zinc-700 gap-3 text-center">
                    <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-400 flex items-center justify-center">
                        <ChalkboardTeacherIcon className="w-6 h-6" />
                    </div>
                    <div className="flex flex-col gap-1 max-w-sm">
                        <span className="font-bold text-sm text-slate-800 dark:text-slate-200">
                            No Sections Assigned
                        </span>
                        <span className="text-xs text-slate-500">
                            This faculty member currently has no sections assigned in this term.
                        </span>
                    </div>
                </div>
            )}

            {/* List of Detailed Section Cards */}
            <div className="flex flex-col gap-3">
                {sections.map((section) => {
                    const availableSlots = section.available_slots ?? Math.max(0, section.max_slots - section.enrolled_count);
                    const fillPercent = section.max_slots > 0
                        ? Math.min(100, Math.round((section.enrolled_count / section.max_slots) * 100))
                        : 0;

                    return (
                        <div
                            className="bg-white dark:bg-zinc-800/90 rounded-2xl border border-slate-200 dark:border-zinc-700/80 p-4 sm:p-5 shadow-xs hover:border-slate-300 dark:hover:border-zinc-600 transition-all flex flex-col gap-3.5"
                            key={section.section_id}
                        >
                            {/* Top Row: Section Code, Course, Status & Actions */}
                            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-slate-100 dark:border-zinc-700/60 pb-3">
                                <div className="flex flex-col gap-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                                            {section.section_code}
                                        </span>
                                        <h4 className="font-bold text-sm sm:text-base text-slate-900 dark:text-slate-100">
                                            {section.course_code} — {section.course_title}
                                        </h4>
                                        <CommonBadgeStatus
                                            label={section.status}
                                            variant={SECTION_STATUS_VARIANT[section.status] || 'info'}
                                        />
                                    </div>
                                    <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                        <span>{section.term_label}</span>
                                        {section.program_code && (
                                            <>
                                                <span>•</span>
                                                <span className="flex items-center gap-1 font-medium text-slate-700 dark:text-slate-300">
                                                    <GraduationCapIcon className="w-3.5 h-3.5 text-indigo-500" />
                                                    {section.program_code} {section.program_name
                                                        ? `(${section.program_name})`
                                                        : ''}
                                                </span>
                                            </>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                                    {/* Opens the section in Section Management */}
                                    <CommonButton
                                        color="inherit"
                                        size="small"
                                        startIcon={<ArrowSquareOutIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />}
                                        title="Open in Section Management to change course, room, slots, schedule, instructor, or grading"
                                        variant="outlined"
                                        onClick={() => handleGoToSectionManagement(section.section_id)}
                                    >
                                        Edit in Section Management
                                    </CommonButton>
                                </div>
                            </div>

                            {/* Section Details Grid */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50/70 dark:bg-zinc-900/40 p-3 rounded-xl border border-slate-100 dark:border-zinc-800 text-xs">
                                <div className="flex flex-col gap-0.5">
                                    <span className="text-[11px] text-slate-500 font-medium">Academic Units</span>
                                    <span className="font-bold text-slate-800 dark:text-slate-200">
                                        {section.units} Units
                                        <span className="text-[10px] text-slate-500 font-normal ml-1">
                                            ({section.lecture_units ?? 0} Lec / {section.lab_units ?? 0} Lab)
                                        </span>
                                    </span>
                                </div>

                                <div className="flex flex-col gap-0.5">
                                    <span className="text-[11px] text-slate-500 font-medium">Capacity & Enrolled</span>
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-slate-800 dark:text-slate-200">
                                            {section.enrolled_count} / {section.max_slots}
                                        </span>
                                        <span className="text-[10px] text-slate-500">
                                            ({availableSlots} open)
                                        </span>
                                    </div>
                                    <div className="w-full bg-slate-200 dark:bg-zinc-700 h-1 rounded-full overflow-hidden mt-0.5">
                                        <div
                                            className={`h-full ${
                                                fillPercent >= 100
                                                    ? 'bg-rose-500'
                                                    : fillPercent >= 80
                                                        ? 'bg-amber-500'
                                                        : 'bg-emerald-500'
                                            }`}
                                            style={{ width: `${fillPercent}%` }}
                                        />
                                    </div>
                                </div>

                                <div className="flex flex-col gap-0.5">
                                    <span className="text-[11px] text-slate-500 font-medium">Section Default Room</span>
                                    <span className="font-semibold text-slate-800 dark:text-slate-200 truncate flex items-center gap-1">
                                        <BuildingsIcon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                        {section.room || 'No Room Set'}
                                    </span>
                                </div>

                                <div className="flex flex-col gap-0.5">
                                    <span className="text-[11px] text-slate-500 font-medium">Academic Year</span>
                                    <span
                                        className={`font-semibold text-[11px] ${
                                            section.is_active_academic_year !== false
                                                ? 'text-emerald-600 dark:text-emerald-400'
                                                : 'text-amber-600 dark:text-amber-400'
                                        }`}
                                    >
                                        {section.is_active_academic_year !== false
                                            ? 'Active Academic Year'
                                            : 'Archived Year'}
                                    </span>
                                </div>
                            </div>

                            {/* Meeting Schedule List */}
                            <div className="flex flex-col gap-1.5">
                                <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                                    <CalendarCheckIcon className="w-3.5 h-3.5 text-blue-500" />
                                    Meeting Schedule & Rooms
                                </span>
                                {section.schedules.length === 0
                                    ? (
                                        <span className="text-xs text-slate-400 italic">
                                        No schedule slots assigned. Set meeting times in Section Management.
                                        </span>
                                    )
                                    : (
                                        <div className="flex flex-wrap gap-2">
                                            {section.schedules.map((slot, sIdx) => (
                                                <div
                                                    className="bg-slate-100 dark:bg-zinc-700/60 px-2.5 py-1 rounded-lg text-xs text-slate-700 dark:text-slate-300 flex items-center gap-1.5 border border-slate-200/50 dark:border-zinc-700"
                                                    key={`${section.section_id}-${sIdx}`}
                                                >
                                                    <span className="font-bold text-slate-900 dark:text-slate-100">
                                                        {slot.day_of_week}
                                                    </span>
                                                    <span className="text-slate-500 dark:text-slate-400">
                                                        {slot.time_start} – {slot.time_end}
                                                    </span>
                                                    {slot.room && (
                                                        <span className="bg-white dark:bg-zinc-800 px-1.5 py-0.2 rounded text-[10px] text-slate-600 dark:text-slate-300 font-medium border border-slate-200 dark:border-zinc-600">
                                                            {slot.room}
                                                        </span>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                            </div>

                            {/* Assigned Instructor */}
                            <div className="pt-2 border-t border-slate-100 dark:border-zinc-700/60 flex items-center gap-2">
                                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 shrink-0">
                                    Assigned Instructor:
                                </span>
                                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-zinc-700/60 text-slate-800 dark:text-slate-200 text-xs font-semibold">
                                    <ChalkboardTeacherIcon className="w-4 h-4 text-brand-600 dark:text-brand-400" />
                                    <span>{section.faculty_name || facultyName || 'Unassigned'}</span>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}