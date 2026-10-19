import { CommonBadgeStatus } from '@components/badge/CommonBadgeStatus';
import CommonButton from '@components/button/CommonButton';
import CommonProgressBar from '@components/progress-bar/CommonProgressBar';
import CommonSelect, { CommonSelectOption } from '@components/select/CommonSelect';
import Tooltip from '@mui/material/Tooltip';
import { GraduationCapIcon, PencilSimpleIcon, PrinterIcon } from '@phosphor-icons/react';
import AssignProgramModal from '@pages/shared/records/AssignProgramModal';
import { getPrograms } from '@services/program/program.service';
import { assignMyProgram, getCurriculumAudit } from '@services/records.service';
import { registrarAssignStudentProgramAndYear } from '@services/registrar-verification.service';
import { useToastStore } from '@stores/toast.store';
import { CurriculumAudit, CurriculumCourse, CurriculumCourseStatus, CurriculumYearLevel } from '@type/records.type';
import { useEffect, useState } from 'react';

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

interface SummaryTileProps {
    label: string;
    value: string;
}

function SummaryTile({ label, value }: SummaryTileProps) {
    return (
        <div className="border border-(--mui-palette-divider) flex flex-col gap-0.5 p-3 rounded-lg">
            <span className="text-(--mui-palette-text-secondary) text-xs uppercase">
                {label}
            </span>
            <span className="font-semibold text-(--mui-palette-text-primary) text-lg">
                {value}
            </span>
        </div>
    );
}

interface YearBlockProps {
    yearLevel: CurriculumYearLevel;
}

function YearBlock({ yearLevel }: YearBlockProps) {
    return (
        <div className="flex flex-col gap-3">
            <h2 className="font-semibold text-(--mui-palette-text-primary) text-base">
                {yearLabel(yearLevel.year_level)}
            </h2>
            {yearLevel.terms.map(function(term) {
                return (
                    <div
                        className="border border-(--mui-palette-divider) flex flex-col rounded-lg"
                        key={`${yearLevel.year_level}-${term.term_type_id ?? 'none'}`}
                    >
                        <div className="bg-(--mui-palette-action-hover) px-3 py-2 rounded-t-lg">
                            <span className="font-medium text-(--mui-palette-text-primary) text-sm">
                                {term.term_type_label}
                            </span>
                        </div>
                        <div className="overflow-x-auto w-full">
                            <table className="min-w-[640px] table-fixed text-sm w-full">
                                <colgroup>
                                    <col className="w-28" />
                                    <col />
                                    <col className="w-20" />
                                    <col className="w-40" />
                                    <col className="w-24" />
                                    <col className="w-36" />
                                </colgroup>
                                <thead>
                                    <tr className="border-b border-(--mui-palette-divider) text-(--mui-palette-text-secondary) text-xs uppercase">
                                        <th className="font-medium px-3 py-2 text-left">Code</th>
                                        <th className="font-medium px-3 py-2 text-left">Course Title</th>
                                        <th className="font-medium px-3 py-2 text-right">Units</th>
                                        <th className="font-medium px-3 py-2 text-left">Term Taken</th>
                                        <th className="font-medium px-3 py-2 text-right">Grade</th>
                                        <th className="font-medium px-3 py-2 text-left">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {term.courses.map(function(course) {
                                        return (
                                            <tr
                                                className="border-b border-(--mui-palette-divider) last:border-b-0"
                                                key={course.curriculum_map_id}
                                            >
                                                <td className="overflow-hidden px-3 py-2 text-(--mui-palette-text-primary) text-ellipsis whitespace-nowrap">
                                                    {course.course_code}
                                                </td>
                                                <td className="px-3 py-2 text-(--mui-palette-text-primary)">
                                                    <div className="flex gap-2 items-center min-w-0">
                                                        <Tooltip
                                                            arrow
                                                            title={course.course_title}
                                                        >
                                                            <span className="overflow-hidden text-ellipsis whitespace-nowrap">
                                                                {course.course_title}
                                                            </span>
                                                        </Tooltip>
                                                        {course.is_elective && (
                                                            <span className="shrink-0 text-(--mui-palette-text-secondary) text-xs">
                                                                Elective
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-3 py-2 text-(--mui-palette-text-primary) text-right">
                                                    {formatUnits(course)}
                                                </td>
                                                <td className="overflow-hidden px-3 py-2 text-(--mui-palette-text-secondary) text-ellipsis whitespace-nowrap">
                                                    {course.taken_label ?? '—'}
                                                </td>
                                                <td className="px-3 py-2 text-(--mui-palette-text-primary) text-right">
                                                    {formatGrade(course)}
                                                </td>
                                                <td className="px-3 py-2">
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
            <p className="text-(--mui-palette-text-secondary) text-sm">
                Loading...
            </p>
        );
    }

    const isSuccess = Boolean(audit && (audit.success ?? Boolean(audit.program?.id)));
    const hasProgram = Boolean(audit?.program?.id);

    if (!isSuccess || !hasProgram || !audit) {
        return (
            <div className="flex flex-col items-center justify-center p-6 text-center max-w-lg mx-auto">
                <div className="border border-(--mui-palette-divider) flex flex-col items-center p-8 rounded-xl shadow-xs w-full bg-(--mui-palette-background-paper) gap-5">
                    <div className="p-4 bg-(--mui-palette-primary-light) text-(--mui-palette-primary-main) rounded-full">
                        <GraduationCapIcon size={40} />
                    </div>
                    <div className="flex flex-col gap-1">
                        <h2 className="font-semibold text-(--mui-palette-text-primary) text-lg">
                            Academic Program Not Assigned
                        </h2>
                        <p className="text-(--mui-palette-text-secondary) text-sm">
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
        <div className="flex flex-col gap-4">
            <div className="flex flex-wrap gap-3 items-start justify-between no-print">
                <div className="flex flex-col">
                    <h1 className="font-semibold text-(--mui-palette-text-primary) text-xl">
                        Curriculum Checklist
                    </h1>
                    <span className="text-(--mui-palette-text-secondary) text-sm">
                        {audit.program.code} · {audit.program.name}
                    </span>
                </div>
                <div className="flex gap-2">
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

            <div className="flex flex-col gap-4 print-area">
                <div className="border border-(--mui-palette-divider) flex flex-col gap-1 p-3 rounded-lg">
                    <span className="font-semibold text-(--mui-palette-text-primary) text-base">
                        {audit.student.full_name}
                    </span>
                    <span className="text-(--mui-palette-text-secondary) text-sm">
                        {audit.student.student_number} · {audit.program.code} · {yearLabel(audit.student.year_level)}
                    </span>
                    <span className="italic text-(--mui-palette-text-secondary) text-xs">
                        Unofficial checklist. Not valid as an official academic record.
                    </span>
                </div>

                <div className="gap-3 grid grid-cols-2 md:grid-cols-5">
                    <SummaryTile
                        label="Units Earned"
                        value={`${formatUnits(summary.earned_units)} / ${formatUnits(summary.required_units)}`}
                    />
                    <SummaryTile
                        label="In Progress"
                        value={formatUnits(summary.in_progress_units)}
                    />
                    <SummaryTile
                        label="Remaining"
                        value={formatUnits(summary.remaining_units)}
                    />
                    <SummaryTile
                        label="Courses Passed"
                        value={`${summary.completed_courses} / ${summary.total_courses}`}
                    />
                    <SummaryTile
                        label="Cumulative GWA"
                        value={summary.cumulative_gwa !== null
                            ? Number(summary.cumulative_gwa)
                                .toFixed(2)
                            : '—'}
                    />
                </div>

                <CommonProgressBar
                    hasSubtext={false}
                    label={`Degree Progress · ${Number(summary.completion_pct)}%`}
                    percentage={Number(summary.completion_pct)}
                    type="label"
                />

                {yearLevels.map(function(yearLevel) {
                    return (
                        <YearBlock
                            key={yearLevel.year_level}
                            yearLevel={yearLevel}
                        />
                    );
                })}
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