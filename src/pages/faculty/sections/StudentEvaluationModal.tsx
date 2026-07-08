import { CommonBadgeStatus } from '@components/badge/CommonBadgeStatus';
import CommonModal from '@components/modal/CommonModal';
import { CalendarCheckIcon, ClipboardTextIcon, GraduationCapIcon, XIcon } from '@phosphor-icons/react';
import { getSectionStudentEvaluation } from '@services/faculty.service';
import { BadgeStatusVariant } from '@type/common/badge.type';
import { StudentEvaluation, StudentEvaluationAssessment, StudentEvaluationAttendance, StudentEvaluationGrade } from '@type/faculty.type';
import { IconButton } from '@mui/material';
import { useEffect, useState } from 'react';

interface StudentEvaluationModalProps {
    enrollmentId: string | null;
    open: boolean;
    onClose: () => void;
}

function gradeStatusVariant(status: string | null): BadgeStatusVariant {
    switch (status) {
    case 'Released':
        return 'success';
    case 'Approved':
        return 'info';
    case 'Submitted':
        return 'warning';
    default:
        return 'info';
    }
}

function submissionStatusVariant(status: string | null): BadgeStatusVariant {
    switch (status) {
    case 'Graded':
        return 'success';
    case 'Submitted':
        return 'info';
    case 'In Progress':
        return 'warning';
    default:
        return 'error';
    }
}

function attendanceRate(attendance: StudentEvaluationAttendance): number {
    if (attendance.recorded <= 0) {
        return 0;
    }

    return Math.round(((attendance.present + attendance.late) / attendance.recorded) * 100);
}

function formatScore(value: number | null): string {
    if (value === null || value === undefined) {
        return '—';
    }

    return String(value);
}

function formatDate(value: string | null): string {
    if (!value) {
        return '—';
    }

    return new Date(value)
        .toLocaleDateString();
}

export default function StudentEvaluationModal({
    enrollmentId,
    open,
    onClose
}: StudentEvaluationModalProps) {
    const [data, setData] = useState<StudentEvaluation | null>(null);

    useEffect(function() {
        if (!open || !enrollmentId) {
            return;
        }

        setData(null);

        async function fetchData() {
            const result = await getSectionStudentEvaluation(enrollmentId as string);
            if (result.data) {
                setData(result.data);
            }
            else {
                onClose();
            }
        }

        fetchData();
    }, [open, enrollmentId]);

    const rate = data
        ? attendanceRate(data.attendance)
        : 0;

    return (
        <CommonModal
            cardProps={{
                className: 'max-h-[88vh] overflow-y-auto w-[min(92vw,760px)]'
            }}
            open={open}
            onClose={onClose}
        >
            <div className="flex flex-col gap-6">
                <div className="flex items-start justify-between">
                    <div className="flex flex-col gap-1">
                        <h2 className="font-semibold text-(--mui-palette-text-primary) text-lg">
                            {data?.profile.full_name ?? 'Loading student…'}
                        </h2>
                        {data && (
                            <div className="flex flex-wrap gap-x-3 gap-y-1 text-(--mui-palette-text-secondary) text-sm">
                                <span>{data.profile.student_number}</span>
                                <span>{data.profile.email}</span>
                                <span>Year {data.profile.year_level}</span>
                                {data.profile.program_name && (
                                    <span>{data.profile.program_name}</span>
                                )}
                            </div>
                        )}
                    </div>
                    <IconButton size="small" onClick={onClose}>
                        <XIcon />
                    </IconButton>
                </div>

                {!data && (
                    <p className="py-8 text-(--mui-palette-text-secondary) text-center text-sm">
                        Loading student evaluation…
                    </p>
                )}

                {data && (
                    <>
                        <section className="flex flex-col gap-3">
                            <div className="flex gap-2 items-center">
                                <CalendarCheckIcon className="text-(--mui-palette-primary-main)" />
                                <h3 className="font-medium text-(--mui-palette-text-primary) text-sm">
                                    Attendance
                                </h3>
                            </div>
                            <div className="gap-3 grid grid-cols-2 sm:grid-cols-5">
                                <div className="bg-(--mui-palette-action-hover) flex flex-col gap-1 p-3 rounded-lg">
                                    <span className="font-semibold text-(--mui-palette-primary-main) text-xl">
                                        {rate}%
                                    </span>
                                    <span className="text-(--mui-palette-text-secondary) text-xs">
                                        Attendance Rate
                                    </span>
                                </div>
                                <AttendanceStat label="Present" value={data.attendance.present} />
                                <AttendanceStat label="Late" value={data.attendance.late} />
                                <AttendanceStat label="Absent" value={data.attendance.absent} />
                                <AttendanceStat label="Excused" value={data.attendance.excused} />
                            </div>
                            <p className="text-(--mui-palette-text-secondary) text-xs">
                                {data.attendance.recorded} of {data.attendance.total_sessions} sessions recorded
                            </p>
                        </section>

                        <section className="flex flex-col gap-3">
                            <div className="flex gap-2 items-center">
                                <ClipboardTextIcon className="text-(--mui-palette-primary-main)" />
                                <h3 className="font-medium text-(--mui-palette-text-primary) text-sm">
                                    Assessments
                                </h3>
                            </div>
                            {data.assessments.length === 0
                                ? (
                                    <p className="text-(--mui-palette-text-secondary) text-sm">
                                        No assessments in this section yet.
                                    </p>
                                )
                                : (
                                    <div className="flex flex-col divide-y divide-(--mui-palette-divider)">
                                        {data.assessments.map((assessment) => (
                                            <AssessmentRow assessment={assessment} key={assessment.id} />
                                        ))}
                                    </div>
                                )
                            }
                        </section>

                        <section className="flex flex-col gap-3">
                            <div className="flex gap-2 items-center">
                                <GraduationCapIcon className="text-(--mui-palette-primary-main)" />
                                <h3 className="font-medium text-(--mui-palette-text-primary) text-sm">
                                    Grades
                                </h3>
                            </div>
                            {data.grades.length === 0
                                ? (
                                    <p className="text-(--mui-palette-text-secondary) text-sm">
                                        No grading periods configured.
                                    </p>
                                )
                                : (
                                    <div className="flex flex-col divide-y divide-(--mui-palette-divider)">
                                        {data.grades.map((grade) => (
                                            <GradeRow grade={grade} key={grade.grading_period_id} />
                                        ))}
                                    </div>
                                )
                            }
                        </section>
                    </>
                )}
            </div>
        </CommonModal>
    );
}

interface AttendanceStatProps {
    label: string;
    value: number;
}

function AttendanceStat({ label, value }: AttendanceStatProps) {
    return (
        <div className="bg-(--mui-palette-action-hover) flex flex-col gap-1 p-3 rounded-lg">
            <span className="font-semibold text-(--mui-palette-text-primary) text-xl">
                {value}
            </span>
            <span className="text-(--mui-palette-text-secondary) text-xs">
                {label}
            </span>
        </div>
    );
}

interface AssessmentRowProps {
    assessment: StudentEvaluationAssessment;
}

function AssessmentRow({ assessment }: AssessmentRowProps) {
    return (
        <div className="flex flex-wrap gap-2 items-center justify-between py-3">
            <div className="flex flex-col gap-0.5 min-w-0">
                <span className="font-medium text-(--mui-palette-text-primary) text-sm truncate">
                    {assessment.title}
                </span>
                <span className="text-(--mui-palette-text-secondary) text-xs">
                    {assessment.assessment_type}
                    {assessment.grading_period_name
                        ? ` · ${assessment.grading_period_name}`
                        : ''}
                    {assessment.due_at
                        ? ` · Due ${formatDate(assessment.due_at)}`
                        : ''}
                </span>
            </div>
            <div className="flex gap-3 items-center">
                <span className="font-medium text-(--mui-palette-text-primary) text-sm">
                    {formatScore(assessment.final_score)} / {assessment.total_points}
                </span>
                {assessment.is_late && (
                    <span className="text-(--mui-palette-error-main) text-xs">Late</span>
                )}
                <CommonBadgeStatus
                    label={assessment.submission_status ?? 'Not Started'}
                    variant={submissionStatusVariant(assessment.submission_status)}
                />
            </div>
        </div>
    );
}

interface GradeRowProps {
    grade: StudentEvaluationGrade;
}

function GradeRow({ grade }: GradeRowProps) {
    const display = grade.special_grade
        ?? (grade.transmuted_grade !== null
            ? String(grade.transmuted_grade)
            : formatScore(grade.final_grade));

    return (
        <div className="flex flex-wrap gap-2 items-center justify-between py-3">
            <div className="flex flex-col gap-0.5">
                <span className="font-medium text-(--mui-palette-text-primary) text-sm">
                    {grade.grading_period_name}
                </span>
                <span className="text-(--mui-palette-text-secondary) text-xs">
                    Raw {formatScore(grade.raw_grade)} · Final {formatScore(grade.final_grade)} · Weight {grade.weight}%
                </span>
            </div>
            <div className="flex gap-3 items-center">
                <span className="font-semibold text-(--mui-palette-text-primary) text-base">
                    {display}
                </span>
                {grade.status && (
                    <CommonBadgeStatus
                        label={grade.status}
                        variant={gradeStatusVariant(grade.status)}
                    />
                )}
            </div>
        </div>
    );
}