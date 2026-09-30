import { CommonBadgeStatus } from '@components/badge/CommonBadgeStatus';
import CommonButton from '@components/button/CommonButton';
import CommonProgressBar from '@components/progress-bar/CommonProgressBar';
import CommonSelect, { CommonSelectOption } from '@components/select/CommonSelect';
import Tooltip from '@mui/material/Tooltip';
import { GraduationCapIcon, PencilSimpleIcon, PrinterIcon } from '@phosphor-icons/react';
import AssignProgramModal from '@pages/shared/records/AssignProgramModal';
import { getPrograms } from '@services/program/program.service';
import { assignMyProgram, getCurriculumAudit } from '@services/records.service';
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

function formatUnits(value: number | null): string {
    return value !== null && value !== undefined
        ? String(Number(value))
        : '—';
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
                        <table className="table-fixed text-sm w-full">
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
                                                {formatUnits(course.units)}
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
        if (!isLoaded || (audit && audit.success)) return;

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
        const result = await assignMyProgram(selectedProgramId, selectedYearLevel);
        setIsAssigning(false);

        if (!result.error) {
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

    if (!audit || !audit.success) {
        return (
            <div className="flex flex-col items-center justify-center p-6 text-center max-w-lg mx-auto">
                <div className="border border-(--mui-palette-divider) flex flex-col items-center p-8 rounded-xl shadow-xs w-full bg-(--mui-palette-background-paper) gap-5">
                    <div className="p-4 bg-(--mui-palette-primary-light) text-(--mui-palette-primary-main) rounded-full">
                        <GraduationCapIcon size={40} />
                    </div>
                    <div className="flex flex-col gap-1">
                        <h2 className="font-semibold text-(--mui-palette-text-primary) text-lg">
                            Assign Your Academic Program
                        </h2>
                        <p className="text-(--mui-palette-text-secondary) text-sm">
                            {audit?.message ?? 'Select your degree program and year level to generate your curriculum checklist and track your degree progress.'}
                        </p>
                    </div>

                    <div className="flex flex-col gap-3 w-full text-left">
                        <CommonSelect
                            disabled={isAssigning || isLoadingPrograms}
                            fullWidth
                            label="Academic Program"
                            options={programOptions}
                            placeholder="Select your program"
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
                        value={`${formatUnits(audit.summary.earned_units)} / ${formatUnits(audit.summary.required_units)}`}
                    />
                    <SummaryTile
                        label="In Progress"
                        value={formatUnits(audit.summary.in_progress_units)}
                    />
                    <SummaryTile
                        label="Remaining"
                        value={formatUnits(audit.summary.remaining_units)}
                    />
                    <SummaryTile
                        label="Courses Passed"
                        value={`${audit.summary.completed_courses} / ${audit.summary.total_courses}`}
                    />
                    <SummaryTile
                        label="Cumulative GWA"
                        value={audit.summary.cumulative_gwa !== null
                            ? Number(audit.summary.cumulative_gwa)
                                .toFixed(2)
                            : '—'}
                    />
                </div>

                <CommonProgressBar
                    hasSubtext={false}
                    label={`Degree Progress · ${Number(audit.summary.completion_pct)}%`}
                    percentage={Number(audit.summary.completion_pct)}
                    type="label"
                />

                {audit.year_levels.map(function(yearLevel) {
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