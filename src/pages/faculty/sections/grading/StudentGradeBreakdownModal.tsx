import { CommonBadgeStatus } from '@components/badge/CommonBadgeStatus';
import CommonButton from '@components/button/CommonButton';
import CommonModal from '@components/modal/CommonModal';
import CommonProgressBar from '@components/progress-bar/CommonProgressBar';
import InsightStatTile from '@pages/shared/analytics/InsightStatTile';
import { CheckCircleIcon, ClockIcon, XIcon } from '@phosphor-icons/react';
import { getFacultyStudentGradeBreakdown } from '@services/faculty.service';
import { FacultyStudentGradeBreakdown } from '@type/faculty.type';
import { formatShortDate } from '@utils/date.util';
import { useEffect, useState } from 'react';

interface StudentGradeBreakdownModalProps {
    enrollmentId: string;
    gradingPeriodId: string;
    open: boolean;
    onClose: () => void;
}

export default function StudentGradeBreakdownModal({
    enrollmentId,
    gradingPeriodId,
    onClose,
    open
}: StudentGradeBreakdownModalProps) {
    const [data, setData] = useState<FacultyStudentGradeBreakdown | null>(null);

    useEffect(function() {
        if (open && enrollmentId && gradingPeriodId) {
            async function fetchData() {
                const result = await getFacultyStudentGradeBreakdown(enrollmentId, gradingPeriodId);
                if (result.data) {
                    setData(result.data);
                }
            }

            fetchData();
        }
    }, [open, enrollmentId, gradingPeriodId]);

    return (
        <CommonModal
            open={open}
            onClose={onClose}
        >
            <div className="bg-(--mui-palette-background-paper) flex flex-col gap-6 max-h-[85vh] max-w-4xl overflow-y-auto p-6 rounded-xl w-full">
                <div className="flex items-start justify-between border-b border-(--mui-palette-divider) pb-4">
                    <div className="flex flex-col gap-1">
                        <div className="flex gap-2 items-center">
                            <h2 className="font-semibold text-(--mui-palette-text-primary) text-xl m-0">
                                {data?.student_name ?? 'Student Grade Audit'}
                            </h2>
                            {data?.status && (
                                <CommonBadgeStatus
                                    label={data.status}
                                    variant={data.status === 'Draft'
                                        ? 'warning'
                                        : 'success'}
                                />
                            )}
                        </div>
                        <span className="text-(--mui-palette-text-secondary) text-sm">
                            {data?.student_number} · {data?.course_code} ({data?.section_code}) — {data?.grading_period_name}
                        </span>
                    </div>
                    <button
                        className="p-1.5 text-(--mui-palette-text-secondary) hover:text-(--mui-palette-text-primary) rounded-lg hover:bg-(--mui-palette-action-hover)"
                        type="button"
                        onClick={onClose}
                    >
                        <XIcon size={20} />
                    </button>
                </div>

                <div className="gap-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                    <InsightStatTile
                        hint="Weighted percentage sum"
                        label="Raw Percentage"
                        value={`${(data?.raw_grade ?? 0).toFixed(2)}%`}
                    />
                    <InsightStatTile
                        hint="Transmuted institutional GPA"
                        label="Transmuted Grade"
                        value={data?.transmuted_grade ?? '—'}
                    />
                    <InsightStatTile
                        hint="Special grade override"
                        label="Special Grade"
                        value={data?.special_grade ?? 'None'}
                    />
                    <InsightStatTile
                        hint="Passing threshold requirement"
                        label="Passing Score"
                        value={`${data?.passing_grade ?? 75}%`}
                    />
                </div>

                <div className="flex flex-col gap-4">
                    <h3 className="font-semibold text-(--mui-palette-text-primary) text-base m-0">
                        Grading Component Audit Breakdown
                    </h3>

                    {(!data?.components || data.components.length === 0) && (
                        <p className="m-0 py-6 text-center text-(--mui-palette-text-secondary) text-sm">
                            No grading components defined for this period.
                        </p>
                    )}

                    {data?.components.map(function(comp) {
                        const pct = comp.percentage ?? 0;

                        return (
                            <div
                                className="bg-(--mui-palette-background-default) flex flex-col gap-3 border border-(--mui-palette-divider) p-4 rounded-lg"
                                key={comp.id}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex flex-col gap-0.5">
                                        <div className="flex gap-2 items-center">
                                            <span className="font-semibold text-(--mui-palette-text-primary) text-sm">
                                                {comp.name}
                                            </span>
                                            <span className="rounded bg-(--mui-palette-primary-main)/10 px-2 py-0.5 font-medium text-(--mui-palette-primary-main) text-xs">
                                                Weight: {comp.weight}%
                                            </span>
                                        </div>
                                        <span className="text-(--mui-palette-text-secondary) text-xs">
                                            Earned {comp.earned_points} / {comp.max_points} pts ({pct.toFixed(2)}%)
                                        </span>
                                    </div>
                                    <div className="flex flex-col items-end">
                                        <span className="font-semibold text-(--mui-palette-text-primary) text-sm">
                                            +{comp.weighted_score.toFixed(2)} pts
                                        </span>
                                        <span className="text-(--mui-palette-text-secondary) text-xs">
                                            towards final grade
                                        </span>
                                    </div>
                                </div>

                                <CommonProgressBar percentage={pct} type="bar" />

                                {comp.items.length > 0 && (
                                    <div className="mt-2 flex flex-col gap-1.5 border-t border-(--mui-palette-divider) pt-3">
                                        <span className="font-medium text-(--mui-palette-text-secondary) text-xs uppercase tracking-wider">
                                            Itemized Assessments ({comp.graded_count}/{comp.items.length} graded)
                                        </span>
                                        <div className="flex flex-col gap-1.5">
                                            {comp.items.map(function(item) {
                                                return (
                                                    <div
                                                        className="bg-(--mui-palette-background-paper) flex items-center justify-between px-3 py-2 border border-(--mui-palette-divider) rounded-md"
                                                        key={item.id}
                                                    >
                                                        <div className="flex gap-2 items-center">
                                                            {item.is_counted
                                                                ? <CheckCircleIcon className="text-emerald-500 shrink-0" size={16} weight="fill" />
                                                                : <ClockIcon className="text-amber-500 shrink-0" size={16} />}
                                                            <div className="flex flex-col">
                                                                <span className="font-medium text-(--mui-palette-text-primary) text-xs">
                                                                    {item.title}
                                                                </span>
                                                                <span className="text-(--mui-palette-text-secondary) text-[11px]">
                                                                    {item.assessment_type} · Due {formatShortDate(item.due_at)}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-medium text-(--mui-palette-text-primary) text-xs">
                                                                {item.earned_points !== null
                                                                    ? `${item.earned_points} / ${item.max_points} pts`
                                                                    : `Not graded (${item.max_points} max pts)`}
                                                            </span>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                <div className="flex justify-end pt-2 border-t border-(--mui-palette-divider)">
                    <CommonButton
                        color="inherit"
                        size="small"
                        variant="outlined"
                        onClick={onClose}
                    >
                        Close Audit
                    </CommonButton>
                </div>
            </div>
        </CommonModal>
    );
}