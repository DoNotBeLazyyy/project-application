import { CommonBadgeStatus } from '@components/badge/CommonBadgeStatus';
import GwaTrendChart from '@pages/shared/analytics/GwaTrendChart';
import InsightStatTile from '@pages/shared/analytics/InsightStatTile';
import MasteryBarList from '@pages/shared/analytics/MasteryBarList';
import { ChartLineUpIcon, TargetIcon, WarningCircleIcon } from '@phosphor-icons/react';
import { getStudentInsight } from '@services/analytics.service';
import { InsightCourse, InsightTrajectory, RiskLevel, StudentInsight } from '@type/analytics.type';
import { useEffect, useState } from 'react';

const RISK_VARIANT_MAP: Record<RiskLevel, 'success' | 'error' | 'warning'> = {
    High: 'error',
    Low: 'success',
    Moderate: 'warning'
};

interface StudentInsightViewProps {
    studentId?: string;
}

function formatPct(value: number | null): string {
    return value !== null && value !== undefined
        ? `${Number(value)
            .toFixed(1)}%`
        : '—';
}

function formatGwa(value: number | null): string {
    return value !== null && value !== undefined
        ? Number(value)
            .toFixed(2)
        : '—';
}

interface TrajectoryCardProps {
    trajectory: InsightTrajectory;
}

function TrajectoryCard({ trajectory }: TrajectoryCardProps) {
    const statusLabel = trajectory.is_currently_qualified
        ? 'On track'
        : trajectory.is_attainable === false
            ? 'Out of reach'
            : 'Reachable';
    const statusVariant = trajectory.is_currently_qualified
        ? 'success'
        : trajectory.is_attainable === false
            ? 'error'
            : 'warning';

    return (
        <div className="border border-(--mui-palette-divider) flex flex-col gap-2 p-3 rounded-lg">
            <div className="flex gap-2 items-center justify-between">
                <span className="font-medium text-(--mui-palette-text-primary) text-sm">
                    {trajectory.label}
                </span>
                <CommonBadgeStatus
                    label={statusLabel}
                    variant={statusVariant}
                />
            </div>
            <span className="text-(--mui-palette-text-secondary) text-xs">
                Requires a GWA of {formatGwa(trajectory.target_gwa)} or better
                {trajectory.discount_pct !== null
                    ? ` · ${Number(trajectory.discount_pct)}% tuition discount`
                    : ''}
            </span>
            {trajectory.is_blocked_by_failing
                ? (
                    <span className="text-(--mui-palette-error-main) text-xs">
                        Blocked: a failing grade on record disqualifies this award.
                    </span>
                )
                : trajectory.is_currently_qualified
                    ? (
                        <span className="text-(--mui-palette-success-main) text-xs">
                            Your cumulative GWA already meets this target. Keep it up.
                        </span>
                    )
                    : trajectory.required_avg_on_remaining !== null
                        ? (
                            <span className="text-(--mui-palette-text-secondary) text-xs">
                                You need to average{' '}
                                <span className="font-medium text-(--mui-palette-text-primary)">
                                    {formatGwa(trajectory.required_avg_on_remaining)}
                                </span>{' '}
                                across your remaining units to reach it.
                            </span>
                        )
                        : (
                            <span className="text-(--mui-palette-text-secondary) text-xs">
                                Not enough released grades yet to project this target.
                            </span>
                        )}
        </div>
    );
}

interface CourseRowProps {
    course: InsightCourse;
}

function CourseRow({ course }: CourseRowProps) {
    return (
        <tr className="border-b border-(--mui-palette-divider) last:border-b-0">
            <td className="px-3 py-2 text-(--mui-palette-text-primary)">
                {course.course_code}
            </td>
            <td className="px-3 py-2 text-(--mui-palette-text-primary)">
                {course.course_title}
            </td>
            <td className="px-3 py-2 text-(--mui-palette-text-primary) text-right">
                {formatPct(course.avg_score_pct)}
            </td>
            <td className="px-3 py-2 text-(--mui-palette-text-primary) text-right">
                {formatPct(course.attendance_rate)}
            </td>
            <td className="px-3 py-2 text-right">
                <span
                    className={course.missing_count > 0
                        ? 'text-(--mui-palette-error-main)'
                        : 'text-(--mui-palette-text-primary)'}
                >
                    {course.missing_count}
                </span>
            </td>
            <td className="px-3 py-2 text-(--mui-palette-text-primary) text-right">
                {formatGwa(course.released_grade)}
            </td>
        </tr>
    );
}

export default function StudentInsightView({ studentId }: StudentInsightViewProps) {
    const [insight, setInsight] = useState<StudentInsight | null>(null);
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(function() {
        async function fetchInsight() {
            const result = await getStudentInsight(studentId);
            if (result.data) setInsight(result.data);
            setIsLoaded(true);
        }

        fetchInsight();
    }, [studentId]);

    if (!isLoaded) {
        return (
            <p className="text-(--mui-palette-text-secondary) text-sm">
                Loading...
            </p>
        );
    }

    if (!insight || !insight.success) {
        return (
            <p className="text-(--mui-palette-text-secondary) text-sm">
                {insight?.message ?? 'Insight is not available.'}
            </p>
        );
    }

    const { academic, engagement, performance, risk } = insight;
    const isFine = performance.granularity === 'fine';

    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-wrap gap-3 items-start justify-between">
                <div className="flex flex-col">
                    <h1 className="font-semibold text-(--mui-palette-text-primary) text-xl">
                        Learning Insight
                    </h1>
                    <span className="text-(--mui-palette-text-secondary) text-sm">
                        {insight.student.full_name} · {insight.student.student_number}
                        {insight.term
                            ? ` · ${insight.term.term_label}`
                            : ''}
                    </span>
                </div>
                <CommonBadgeStatus
                    label={`${risk.risk_level} risk`}
                    variant={RISK_VARIANT_MAP[risk.risk_level]}
                />
            </div>

            {risk.is_at_risk && risk.reasons.length > 0 && (
                <div className="border border-(--mui-palette-error-main) flex flex-col gap-2 p-3 rounded-lg">
                    <div className="flex gap-2 items-center">
                        <WarningCircleIcon
                            className="text-(--mui-palette-error-main)"
                            size={18}
                            weight="fill"
                        />
                        <span className="font-medium text-(--mui-palette-error-main) text-sm">
                            You are flagged at risk (score {Number(risk.risk_score)
                                .toFixed(0)}/100)
                        </span>
                    </div>
                    <ul className="flex flex-col gap-1 list-disc pl-8">
                        {risk.reasons.map(function(reason) {
                            return (
                                <li
                                    className="text-(--mui-palette-text-secondary) text-sm"
                                    key={reason}
                                >
                                    {reason}
                                </li>
                            );
                        })}
                    </ul>
                </div>
            )}

            <div className="gap-3 grid grid-cols-2 md:grid-cols-6">
                <InsightStatTile
                    hint="All released grades"
                    label="Cumulative GWA"
                    value={formatGwa(academic.cumulative_gwa)}
                />
                <InsightStatTile
                    hint="Current term"
                    label="Term GWA"
                    value={formatGwa(academic.term_gwa)}
                />
                <InsightStatTile
                    hint="Graded assessments"
                    label="Avg Score"
                    value={formatPct(performance.avg_score_pct)}
                />
                <InsightStatTile
                    hint={`${engagement.absent_count} absence(s)`}
                    label="Attendance"
                    value={formatPct(engagement.attendance_rate)}
                />
                <InsightStatTile
                    hint={`${engagement.missing_count} missing`}
                    label="On-time Work"
                    value={formatPct(engagement.on_time_rate)}
                />
                <InsightStatTile
                    hint={`${Number(academic.remaining_units)} units remaining`}
                    label="Units Earned"
                    value={`${Number(academic.earned_units)} / ${Number(academic.required_units)}`}
                />
            </div>

            {insight.recommended_focus.length > 0 && (
                <div className="flex flex-col gap-3">
                    <div className="flex gap-2 items-center">
                        <TargetIcon
                            className="text-(--mui-palette-primary-main)"
                            size={18}
                            weight="bold"
                        />
                        <h2 className="font-semibold text-(--mui-palette-text-primary) text-base">
                            Recommended Focus
                        </h2>
                    </div>
                    <div className="flex flex-col gap-2">
                        {insight.recommended_focus.map(function(focus) {
                            return (
                                <div
                                    className="border border-(--mui-palette-divider) flex flex-col gap-0.5 p-3 rounded-lg"
                                    key={`${focus.priority}-${focus.title}`}
                                >
                                    <span className="font-medium text-(--mui-palette-text-primary) text-sm">
                                        {focus.title}
                                    </span>
                                    <span className="text-(--mui-palette-text-secondary) text-sm">
                                        {focus.detail}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            <div className="flex flex-col gap-3">
                <h2 className="font-semibold text-(--mui-palette-text-primary) text-base">
                    Honors &amp; Scholarship Trajectory
                </h2>
                {insight.trajectory.length > 0
                    ? (
                        <div className="gap-3 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
                            {insight.trajectory.map(function(trajectory) {
                                return (
                                    <TrajectoryCard
                                        key={trajectory.code}
                                        trajectory={trajectory}
                                    />
                                );
                            })}
                        </div>
                    )
                    : (
                        <p className="text-(--mui-palette-text-secondary) text-sm">
                            No honor or scholarship thresholds are configured.
                        </p>
                    )}
            </div>

            <div className="flex flex-col gap-3">
                <div className="flex gap-2 items-center">
                    <ChartLineUpIcon
                        className="text-(--mui-palette-primary-main)"
                        size={18}
                        weight="bold"
                    />
                    <h2 className="font-semibold text-(--mui-palette-text-primary) text-base">
                        GWA Trend
                    </h2>
                </div>
                <GwaTrendChart points={insight.gwa_trend} />
            </div>

            <div className="gap-6 grid grid-cols-1 lg:grid-cols-2">
                <div className="flex flex-col gap-3">
                    <h2 className="font-semibold text-(--mui-palette-text-primary) text-base">
                        Strengths
                    </h2>
                    <MasteryBarList
                        emptyLabel="No area is above 80% yet."
                        entries={performance.strengths}
                    />
                </div>
                <div className="flex flex-col gap-3">
                    <h2 className="font-semibold text-(--mui-palette-text-primary) text-base">
                        Weaknesses
                    </h2>
                    <MasteryBarList
                        emptyLabel="Nothing is below 75%. Solid work."
                        entries={performance.weaknesses}
                    />
                </div>
            </div>

            <div className="flex flex-col gap-3">
                <div className="flex gap-2 items-baseline justify-between">
                    <h2 className="font-semibold text-(--mui-palette-text-primary) text-base">
                        {isFine
                            ? 'Mastery by Competency'
                            : 'Mastery by Assessment Type'}
                    </h2>
                    <span className="text-(--mui-palette-text-secondary) text-xs">
                        {isFine
                            ? 'Fine-grained: computed from competency-tagged questions'
                            : 'Medium-grained: tag questions with competencies for finer insight'}
                    </span>
                </div>
                <MasteryBarList
                    emptyLabel="No graded assessments yet."
                    entries={isFine
                        ? performance.by_competency
                        : performance.by_assessment_type}
                />
            </div>

            <div className="flex flex-col gap-3">
                <h2 className="font-semibold text-(--mui-palette-text-primary) text-base">
                    Current Courses
                </h2>
                <div className="border border-(--mui-palette-divider) overflow-x-auto rounded-lg">
                    <table className="text-sm w-full">
                        <thead>
                            <tr className="border-b border-(--mui-palette-divider) text-(--mui-palette-text-secondary) text-xs uppercase">
                                <th className="font-medium px-3 py-2 text-left">Code</th>
                                <th className="font-medium px-3 py-2 text-left">Course</th>
                                <th className="font-medium px-3 py-2 text-right">Avg Score</th>
                                <th className="font-medium px-3 py-2 text-right">Attendance</th>
                                <th className="font-medium px-3 py-2 text-right">Missing</th>
                                <th className="font-medium px-3 py-2 text-right">Released Grade</th>
                            </tr>
                        </thead>
                        <tbody>
                            {insight.courses.map(function(course) {
                                return (
                                    <CourseRow
                                        course={course}
                                        key={course.enrollment_id}
                                    />
                                );
                            })}
                        </tbody>
                    </table>
                </div>
                {insight.courses.length === 0 && (
                    <p className="text-(--mui-palette-text-secondary) text-sm">
                        No active enrollments for this term.
                    </p>
                )}
            </div>
        </div>
    );
}