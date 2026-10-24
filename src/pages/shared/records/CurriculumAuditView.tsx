import { CommonBadgeStatus } from '@components/badge/CommonBadgeStatus';
import CommonButton from '@components/button/CommonButton';
import CommonProgressBar from '@components/progress-bar/CommonProgressBar';
import CommonSelect, { CommonSelectOption } from '@components/select/CommonSelect';
import Tooltip from '@mui/material/Tooltip';
import {
    CheckCircleIcon,
    ClockIcon,
    GraduationCapIcon,
    HourglassIcon,
    ListChecksIcon,
    PencilSimpleIcon,
    PrinterIcon,
    UserIcon
} from '@phosphor-icons/react';
import AssignProgramModal from '@pages/shared/records/AssignProgramModal';
import { getPrograms } from '@services/program/program.service';
import { assignMyProgram, getCurriculumAudit } from '@services/records.service';
import { registrarAssignStudentProgramAndYear } from '@services/registrar-verification.service';
import { useToastStore } from '@stores/toast.store';
import { CurriculumAudit, CurriculumCourse, CurriculumCourseStatus, CurriculumYearLevel } from '@type/records.type';
import { ReactNode, useEffect, useState } from 'react';

const STATUS_VARIANT_MAP: Record<CurriculumCourseStatus, 'success' | 'error' | 'warning' | 'info'> = {
    Completed: 'success',
    Failed: 'error',
    'In Progress': 'warning',
    'Not Taken': 'info'
};

const YEAR_LABELS = ['1st Year', '2nd Year', '3rd Year', '4th Year', '5th Year', '6th Year'];

const YEAR_LEVEL_OPTIONS: CommonSelectOption[] = [
    { label: '1st Year', value: 1 },
    { label: '2nd Year', value: 2 },
    { label: '3rd Year', value: 3 },
    { label: '4th Year', value: 4 },
    { label: '5th Year', value: 5 },
    { label: '6th Year', value: 6 }
];

interface CurriculumAuditViewProps {
    studentId?: string;
}

function formatUnits(value: number | null | undefined | CurriculumCourse): string {
    if (value === null || value === undefined) return '—';
    if (typeof value === 'object') {
        const course = value;
        if (course.units === null || course.units === undefined) return '—';
        if (course.lecture_units !== undefined && course.lecture_units !== null && course.laboratory_units !== undefined && course.laboratory_units !== null) {
            if (course.lecture_units > 0 || course.laboratory_units > 0) {
                return `${course.units} (${course.lecture_units} Lec / ${course.laboratory_units} Lab)`;
            }
        }
        return String(Number(course.units));
    }
    return String(Number(value));
}

function formatGrade(course: CurriculumCourse): string {
    if (course.special_grade) return course.special_grade;

    return course.grade !== null
        ? Number(course.grade)
            .toFixed(2)
        : '—';
}

function yearLabel(level: number): string {
    return YEAR_LABELS[level - 1] ?? `Year ${level}`;
}

interface AuditMetricCardProps {
    hint?: string;
    icon: ReactNode;
    iconBg: string;
    iconColor: string;
    label: string;
    value: string;
}

function AuditMetricCard({ hint, icon, iconBg, iconColor, label, value }: AuditMetricCardProps) {
    return (
        <div className="bg-slate-50/70 dark:bg-zinc-800/60 border border-slate-200/80 dark:border-zinc-800 flex items-center gap-3 p-3 sm:p-3.5 rounded-2xl shadow-2xs min-w-0 transition-all">
            <div className={`flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-xl ${iconBg}`}>
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

interface YearBlockProps {
    yearLevel: CurriculumYearLevel;
}

function YearBlock({ yearLevel }: YearBlockProps) {
    return (
        <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 px-1">
                <span className="font-bold text-slate-900 dark:text-slate-100 text-base sm:text-lg">
                    {yearLabel(yearLevel.year_level)}
                </span>
            </div>
            {yearLevel.terms.map(function(term) {
                const termUnits = term.courses.reduce(function(acc, c) {
                    return acc + (Number(c.units) || 0);
                }, 0);

                return (
                    <div
                        className="border border-slate-200/90 dark:border-zinc-800 flex flex-col rounded-xl overflow-hidden bg-white dark:bg-zinc-900 shadow-2xs mb-2"
                        key={`${yearLevel.year_level}-${term.term_type_id ?? 'none'}`}
                    >
                        <div className="bg-slate-50 dark:bg-zinc-800/60 px-4 py-3 border-b border-slate-200/80 dark:border-zinc-800 flex items-center justify-between">
                            <span className="font-bold text-slate-900 dark:text-slate-100 text-sm sm:text-base">
                                {term.term_type_label}
                            </span>
                            <span className="font-medium text-xs px-2.5 py-0.5 rounded-full bg-slate-200/60 dark:bg-zinc-700 text-slate-700 dark:text-slate-300">
                                {termUnits} Units
                            </span>
                        </div>
                        <div className="overflow-x-auto w-full">
                            <table className="min-w-[640px] table-fixed text-sm w-full">
                                <colgroup>
                                    <col className="w-28" />
                                    <col />
                                    <col className="w-24" />
                                    <col className="w-36" />
                                    <col className="w-20" />
                                    <col className="w-32" />
                                </colgroup>
                                <thead>
                                    <tr className="border-b border-slate-200/70 dark:border-zinc-800 text-slate-500 dark:text-slate-400 text-xs uppercase bg-slate-50/40 dark:bg-zinc-900/40">
                                        <th className="font-semibold px-4 py-2.5 text-left">Code</th>
                                        <th className="font-semibold px-4 py-2.5 text-left">Course Title</th>
                                        <th className="font-semibold px-4 py-2.5 text-right">Units</th>
                                        <th className="font-semibold px-4 py-2.5 text-left">Term Taken</th>
                                        <th className="font-semibold px-4 py-2.5 text-right">Grade</th>
                                        <th className="font-semibold px-4 py-2.5 text-left">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {term.courses.map(function(course) {
                                        return (
                                            <tr
                                                className="border-b border-slate-100 dark:border-zinc-800/60 last:border-b-0 hover:bg-slate-50/70 dark:hover:bg-zinc-800/40 transition-colors"
                                                key={course.curriculum_map_id}
                                            >
                                                <td className="font-mono font-medium px-4 py-3 text-blue-700 dark:text-blue-400 text-xs sm:text-sm whitespace-nowrap">
                                                    {course.course_code}
                                                </td>
                                                <td className="px-4 py-3 text-slate-900 dark:text-slate-100">
                                                    <div className="flex gap-2 items-center min-w-0">
                                                        <Tooltip
                                                            arrow
                                                            title={course.course_title}
                                                        >
                                                            <span className="font-medium truncate">
                                                                {course.course_title}
                                                            </span>
                                                        </Tooltip>
                                                        {course.is_elective && (
                                                            <span className="shrink-0 text-slate-500 dark:text-slate-400 text-[11px] bg-slate-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded">
                                                                Elective
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-slate-700 dark:text-slate-300 text-right text-xs sm:text-sm">
                                                    {formatUnits(course)}
                                                </td>
                                                <td className="overflow-hidden px-4 py-3 text-slate-500 dark:text-slate-400 text-xs truncate whitespace-nowrap">
                                                    {course.taken_label ?? '—'}
                                                </td>
                                                <td className="font-mono font-semibold px-4 py-3 text-slate-900 dark:text-slate-100 text-right text-xs sm:text-sm">
                                                    {formatGrade(course)}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <CommonBadgeStatus
                                                        label={course.status}
                                                        variant={STATUS_VARIANT_MAP[course.status]}
                                                    />
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

export default function CurriculumAuditView({ studentId }: CurriculumAuditViewProps) {
    const [audit, setAudit] = useState<CurriculumAudit | null>(null);
    const [isLoaded, setIsLoaded] = useState(false);
    const [isChangeModalOpen, setIsChangeModalOpen] = useState(false);
    const [programOptions, setProgramOptions] = useState<CommonSelectOption[]>([]);
    const [selectedProgramId, setSelectedProgramId] = useState<string>('');
    const [selectedYearLevel, setSelectedYearLevel] = useState<number>(1);
    const [isAssigning, setIsAssigning] = useState(false);
    const [isLoadingPrograms, setIsLoadingPrograms] = useState(false);

    async function fetchAudit() {
        setIsLoaded(false);
        const result = await getCurriculumAudit(studentId);
        if (result.data) {
            setAudit(result.data);
        } else {
            setAudit(null);
        }
        setIsLoaded(true);
    }

    useEffect(function() {
        fetchAudit();
    }, [studentId]);

    useEffect(function() {
        if (!isLoaded || (audit && (audit.success ?? Boolean(audit.program?.id)))) return;

        async function fetchPrograms() {
            setIsLoadingPrograms(true);
            const result = await getPrograms();
            if (result.data) {
                setProgramOptions(
                    result.data.map(function(program) {
                        return {
                            label: `${program.code} · ${program.label}`,
                            value: program.id
                        };
                    })
                );
            }
            setIsLoadingPrograms(false);
        }

        fetchPrograms();
    }, [isLoaded, audit]);

    function handlePrint() {
        window.print();
    }

    async function handleAssignProgram() {
        if (!selectedProgramId) return;

        setIsAssigning(true);
        let error: unknown = null;
        if (studentId) {
            const result = await registrarAssignStudentProgramAndYear(studentId, selectedProgramId, selectedYearLevel);
            error = result.error;
        } else {
            const result = await assignMyProgram(selectedProgramId, selectedYearLevel);
            error = result.error;
        }
        setIsAssigning(false);

        if (!error) {
            useToastStore.getState().showToast('Program assigned successfully.', 'success');
            await fetchAudit();
        }
    }

    if (!isLoaded) {
        return (
            <div className="py-16 text-center text-slate-500 dark:text-slate-400 text-sm">
                Loading curriculum audit…
            </div>
        );
    }

    const isSuccess = Boolean(audit && (audit.success ?? Boolean(audit.program?.id)));
    const hasProgram = Boolean(audit?.program?.id);

    if (!isSuccess || !hasProgram || !audit) {
        return (
            <div className="flex flex-col items-center justify-center p-6 text-center max-w-lg mx-auto">
                <div className="border border-slate-200 dark:border-zinc-800 flex flex-col items-center p-8 rounded-2xl shadow-xs w-full bg-white dark:bg-zinc-900 gap-5">
                    <div className="p-4 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 rounded-full">
                        <GraduationCapIcon size={40} />
                    </div>
                    <div className="flex flex-col gap-1">
                        <h2 className="font-bold text-slate-900 dark:text-slate-100 text-lg">
                            Academic Program Not Assigned
                        </h2>
                        <p className="text-slate-500 text-sm">
                            {studentId
                                ? 'This student does not have an assigned academic program yet. Assign a program below.'
                                : 'You do not have an assigned academic program yet. Select your degree program and year level below to initialize your curriculum checklist.'}
                        </p>
                    </div>

                    <div className="flex flex-col gap-3 w-full text-left">
                        <CommonSelect
                            disabled={isAssigning || isLoadingPrograms}
                            fullWidth
                            label="Academic Program"
                            options={programOptions}
                            placeholder="Select program"
                            size="small"
                            value={selectedProgramId}
                            onChange={function(e) {
                                setSelectedProgramId(e.target.value as string);
                            }}
                        />
                        <CommonSelect
                            disabled={isAssigning}
                            fullWidth
                            label="Year Level"
                            options={YEAR_LEVEL_OPTIONS}
                            size="small"
                            value={selectedYearLevel}
                            onChange={function(e) {
                                setSelectedYearLevel(Number(e.target.value));
                            }}
                        />
                        <CommonButton
                            className="w-full mt-2"
                            disabled={isAssigning || !selectedProgramId}
                            loading={isAssigning}
                            size="medium"
                            variant="contained"
                            onClick={handleAssignProgram}
                        >
                            {isAssigning ? 'Assigning Program...' : 'Assign Program'}
                        </CommonButton>
                    </div>
                </div>
            </div>
        );
    }

    const summary = audit.summary ?? {
        required_units: audit.progress?.required_units ?? 0,
        earned_units: audit.progress?.earned_units ?? 0,
        in_progress_units: audit.progress?.in_progress_units ?? 0,
        remaining_units: Math.max(0, (audit.progress?.required_units ?? 0) - (audit.progress?.earned_units ?? 0) - (audit.progress?.in_progress_units ?? 0)),
        completion_pct: audit.progress?.progress_percent ?? 0,
        total_courses: audit.progress?.total_courses ?? 0,
        completed_courses: audit.progress?.completed_courses ?? 0,
        failed_courses: audit.progress?.failed_courses ?? 0,
        in_progress_courses: audit.progress?.in_progress_courses ?? 0,
        cumulative_gwa: audit.progress?.cumulative_gwa ?? null
    };

    const yearLevels = audit.year_levels ?? audit.curriculum ?? [];

    return (
        <div className="flex flex-col gap-5">
            {/* Header with Title and Actions */}
            <div className="flex flex-wrap gap-3 items-center justify-between no-print pb-3 border-b border-slate-200/80 dark:border-zinc-800">
                <div className="flex flex-col">
                    <h1 className="font-bold text-slate-900 dark:text-slate-100 text-xl tracking-tight">
                        Curriculum Checklist
                    </h1>
                    <span className="text-slate-500 dark:text-slate-400 text-sm">
                        {audit.program.code} · {audit.program.name}
                    </span>
                </div>
                <div className="flex gap-2.5">
                    {Boolean(studentId) && (
                        <CommonButton
                            size="small"
                            startIcon={<PencilSimpleIcon size={16} />}
                            variant="outlined"
                            onClick={function() {
                                setIsChangeModalOpen(true);
                            }}
                        >
                            Change Program
                        </CommonButton>
                    )}
                    <CommonButton
                        size="small"
                        startIcon={<PrinterIcon size={16} />}
                        variant="outlined"
                        onClick={handlePrint}
                    >
                        Print Checklist
                    </CommonButton>
                </div>
            </div>

            <div className="flex flex-col gap-5 print-area">
                {/* Student Record Identity Card */}
                <div className="bg-slate-50/80 dark:bg-zinc-800/60 border border-slate-200/80 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl gap-3 shadow-2xs">
                    <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 shrink-0">
                            <UserIcon size={22} weight="bold" />
                        </div>
                        <div className="flex flex-col min-w-0">
                            <span className="font-bold text-slate-900 dark:text-slate-100 text-base">
                                {audit.student.full_name}
                            </span>
                            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                <span className="font-mono">{audit.student.student_number}</span>
                                <span>·</span>
                                <span className="font-semibold text-blue-600 dark:text-blue-400">{audit.program.code}</span>
                                <span>·</span>
                                <span>{yearLabel(audit.student.year_level)}</span>
                            </div>
                        </div>
                    </div>
                    <span className="text-[11px] italic text-slate-400 dark:text-zinc-500 self-start sm:self-center">
                        Unofficial checklist. Not valid as an official transcript.
                    </span>
                </div>

                {/* Metric Summary Cards Grid */}
                <div className="gap-3 sm:gap-4 grid grid-cols-2 md:grid-cols-5">
                    <AuditMetricCard
                        hint="Credited of required"
                        icon={<CheckCircleIcon size={22} />}
                        iconBg="bg-emerald-50 dark:bg-emerald-950/60"
                        iconColor="text-emerald-600 dark:text-emerald-400"
                        label="Units Earned"
                        value={`${formatUnits(summary.earned_units)} / ${formatUnits(summary.required_units)}`}
                    />
                    <AuditMetricCard
                        hint="Current term"
                        icon={<ClockIcon size={22} />}
                        iconBg="bg-amber-50 dark:bg-amber-950/60"
                        iconColor="text-amber-600 dark:text-amber-400"
                        label="In Progress"
                        value={formatUnits(summary.in_progress_units)}
                    />
                    <AuditMetricCard
                        hint="To graduate"
                        icon={<HourglassIcon size={22} />}
                        iconBg="bg-slate-100 dark:bg-zinc-800"
                        iconColor="text-slate-600 dark:text-slate-300"
                        label="Remaining"
                        value={formatUnits(summary.remaining_units)}
                    />
                    <AuditMetricCard
                        hint="Completed courses"
                        icon={<ListChecksIcon size={22} />}
                        iconBg="bg-blue-50 dark:bg-blue-950/60"
                        iconColor="text-blue-600 dark:text-blue-400"
                        label="Courses Passed"
                        value={`${summary.completed_courses} / ${summary.total_courses}`}
                    />
                    <AuditMetricCard
                        hint="Weighted grade"
                        icon={<GraduationCapIcon size={22} />}
                        iconBg="bg-purple-50 dark:bg-purple-950/60"
                        iconColor="text-purple-600 dark:text-purple-400"
                        label="Cumulative GWA"
                        value={summary.cumulative_gwa !== null
                            ? Number(summary.cumulative_gwa)
                                .toFixed(2)
                            : '—'}
                    />
                </div>

                {/* Degree Completion Progress */}
                <div className="bg-slate-50 dark:bg-zinc-800/40 border border-slate-200/80 dark:border-zinc-800 p-4 rounded-xl">
                    <CommonProgressBar
                        hasSubtext={false}
                        label={`Degree Completion Progress · ${Number(summary.completion_pct)}%`}
                        percentage={Number(summary.completion_pct)}
                        type="label"
                    />
                </div>

                {/* Year Level Blocks */}
                <div className="flex flex-col gap-6">
                    {yearLevels.map(function(yearLevel) {
                        return (
                            <YearBlock
                                key={yearLevel.year_level}
                                yearLevel={yearLevel}
                            />
                        );
                    })}
                </div>
            </div>

            <AssignProgramModal
                currentProgramId={audit.program.id}
                currentProgramName={`${audit.program.code} · ${audit.program.name}`}
                currentYearLevel={audit.student.year_level}
                open={isChangeModalOpen}
                studentId={studentId}
                onClose={function() {
                    setIsChangeModalOpen(false);
                }}
                onSuccess={fetchAudit}
            />
        </div>
    );
}
