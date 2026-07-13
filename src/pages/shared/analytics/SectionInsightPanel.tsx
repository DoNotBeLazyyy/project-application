import { CommonBadgeStatus } from '@components/badge/CommonBadgeStatus';
import InsightStatTile from '@pages/shared/analytics/InsightStatTile';
import MasteryBarList from '@pages/shared/analytics/MasteryBarList';
import { getSectionInsight } from '@services/analytics.service';
import { RiskLevel, ScoreDistributionBucket, SectionInsight, SectionInsightStudent } from '@type/analytics.type';
import { useEffect, useState } from 'react';

const RISK_VARIANT_MAP: Record<RiskLevel, 'success' | 'error' | 'warning'> = {
    High: 'error',
    Low: 'success',
    Moderate: 'warning'
};

interface SectionInsightPanelProps {
    sectionId: string;
}

function formatPct(value: number | null): string {
    return value !== null && value !== undefined
        ? `${Number(value)
            .toFixed(1)}%`
        : '—';
}

interface DistributionChartProps {
    buckets: ScoreDistributionBucket[];
}

function DistributionChart({ buckets }: DistributionChartProps) {
    const maxCount = buckets.reduce(function(max, bucket) {
        return Math.max(max, bucket.student_count);
    }, 0);

    if (maxCount === 0) {
        return (
            <p className="text-(--mui-palette-text-secondary) text-sm">
                No graded assessments yet.
            </p>
        );
    }

    return (
        <div className="flex gap-3 h-40 items-end">
            {buckets.map(function(bucket) {
                const heightPct = bucket.student_count / maxCount * 100;

                return (
                    <div
                        className="flex flex-1 flex-col gap-1 h-full items-center justify-end"
                        key={bucket.bucket}
                    >
                        <span className="text-(--mui-palette-text-primary) text-xs">
                            {bucket.student_count}
                        </span>
                        <div
                            className="bg-(--mui-palette-primary-main) rounded-t w-full"
                            style={{ height: `${Math.max(heightPct, 2)}%` }}
                        />
                        <span className="text-(--mui-palette-text-secondary) text-xs">
                            {bucket.bucket}
                        </span>
                    </div>
                );
            })}
        </div>
    );
}

interface StudentRowProps {
    student: SectionInsightStudent;
}

function StudentRow({ student }: StudentRowProps) {
    return (
        <tr className="border-b border-(--mui-palette-divider) last:border-b-0">
            <td className="px-3 py-2 text-(--mui-palette-text-primary)">
                {student.student_number}
            </td>
            <td className="px-3 py-2 text-(--mui-palette-text-primary)">
                {student.full_name}
            </td>
            <td className="px-3 py-2 text-(--mui-palette-text-primary) text-right">
                {formatPct(student.avg_score_pct)}
            </td>
            <td className="px-3 py-2 text-(--mui-palette-text-primary) text-right">
                {formatPct(student.attendance_rate)}
            </td>
            <td className="px-3 py-2 text-right">
                <span
                    className={student.missing_count > 0
                        ? 'text-(--mui-palette-error-main)'
                        : 'text-(--mui-palette-text-primary)'}
                >
                    {student.missing_count}
                </span>
            </td>
            <td className="px-3 py-2 text-(--mui-palette-text-primary) text-right">
                {Number(student.risk_score)
                    .toFixed(0)}
            </td>
            <td className="px-3 py-2">
                <CommonBadgeStatus
                    label={student.risk_level}
                    variant={RISK_VARIANT_MAP[student.risk_level]}
                />
            </td>
        </tr>
    );
}

export default function SectionInsightPanel({ sectionId }: SectionInsightPanelProps) {
    const [insight, setInsight] = useState<SectionInsight | null>(null);
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(function() {
        async function fetchInsight() {
            const result = await getSectionInsight(sectionId);
            if (result.data) setInsight(result.data);
            setIsLoaded(true);
        }

        fetchInsight();
    }, [sectionId]);

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

    const { mastery, summary } = insight;
    const isFine = mastery.granularity === 'fine';
    const atRisk = insight.students.filter(function(student) {
        return student.is_at_risk;
    });

    return (
        <div className="flex flex-col gap-6 h-full overflow-y-auto">
            <div className="gap-3 grid grid-cols-2 md:grid-cols-4">
                <InsightStatTile
                    label="Enrolled"
                    value={String(summary.enrolled_count)}
                />
                <InsightStatTile
                    hint="Risk score 30 or higher"
                    label="At Risk"
                    value={String(summary.at_risk_count)}
                />
                <InsightStatTile
                    hint="Across graded assessments"
                    label="Cohort Avg Score"
                    value={formatPct(summary.avg_score_pct)}
                />
                <InsightStatTile
                    hint={`Submission rate ${formatPct(summary.submission_rate)}`}
                    label="Cohort Attendance"
                    value={formatPct(summary.avg_attendance_rate)}
                />
            </div>

            <div className="flex flex-col gap-3">
                <div className="flex gap-2 items-baseline justify-between">
                    <h2 className="font-semibold text-(--mui-palette-text-primary) text-base">
                        {isFine
                            ? 'Competency Mastery Gaps'
                            : 'Mastery Gaps by Assessment Type'}
                    </h2>
                    <span className="text-(--mui-palette-text-secondary) text-xs">
                        {isFine
                            ? 'Fine-grained: computed from competency-tagged questions'
                            : 'Medium-grained: tag questions with competencies for finer insight'}
                    </span>
                </div>
                <MasteryBarList
                    emptyLabel="No area is below 75%. The cohort is on track."
                    entries={mastery.gaps}
                />
            </div>

            <div className="gap-6 grid grid-cols-1 lg:grid-cols-2">
                <div className="flex flex-col gap-3">
                    <h2 className="font-semibold text-(--mui-palette-text-primary) text-base">
                        Score Distribution
                    </h2>
                    <DistributionChart buckets={insight.score_distribution} />
                </div>
                <div className="flex flex-col gap-3">
                    <h2 className="font-semibold text-(--mui-palette-text-primary) text-base">
                        {isFine
                            ? 'All Competencies'
                            : 'All Assessment Types'}
                    </h2>
                    <MasteryBarList
                        emptyLabel="No graded assessments yet."
                        entries={isFine
                            ? mastery.by_competency
                            : mastery.by_assessment_type}
                    />
                </div>
            </div>

            <div className="flex flex-col gap-3">
                <div className="flex gap-2 items-baseline justify-between">
                    <h2 className="font-semibold text-(--mui-palette-text-primary) text-base">
                        At-Risk Students
                    </h2>
                    <span className="text-(--mui-palette-text-secondary) text-xs">
                        {atRisk.length} of {insight.students.length} flagged
                    </span>
                </div>
                <div className="border border-(--mui-palette-divider) overflow-x-auto rounded-lg">
                    <table className="text-sm w-full">
                        <thead>
                            <tr className="border-b border-(--mui-palette-divider) text-(--mui-palette-text-secondary) text-xs uppercase">
                                <th className="font-medium px-3 py-2 text-left">Student No.</th>
                                <th className="font-medium px-3 py-2 text-left">Name</th>
                                <th className="font-medium px-3 py-2 text-right">Avg Score</th>
                                <th className="font-medium px-3 py-2 text-right">Attendance</th>
                                <th className="font-medium px-3 py-2 text-right">Missing</th>
                                <th className="font-medium px-3 py-2 text-right">Risk</th>
                                <th className="font-medium px-3 py-2 text-left">Level</th>
                            </tr>
                        </thead>
                        <tbody>
                            {insight.students.map(function(student) {
                                return (
                                    <StudentRow
                                        key={student.enrollment_id}
                                        student={student}
                                    />
                                );
                            })}
                        </tbody>
                    </table>
                </div>
                {insight.students.length === 0 && (
                    <p className="text-(--mui-palette-text-secondary) text-sm">
                        No students are enrolled in this section.
                    </p>
                )}
            </div>

            <div className="flex flex-col gap-3">
                <h2 className="font-semibold text-(--mui-palette-text-primary) text-base">
                    Assessment Performance
                </h2>
                <div className="border border-(--mui-palette-divider) overflow-x-auto rounded-lg">
                    <table className="text-sm w-full">
                        <thead>
                            <tr className="border-b border-(--mui-palette-divider) text-(--mui-palette-text-secondary) text-xs uppercase">
                                <th className="font-medium px-3 py-2 text-left">Assessment</th>
                                <th className="font-medium px-3 py-2 text-left">Type</th>
                                <th className="font-medium px-3 py-2 text-right">Avg</th>
                                <th className="font-medium px-3 py-2 text-right">High</th>
                                <th className="font-medium px-3 py-2 text-right">Low</th>
                                <th className="font-medium px-3 py-2 text-right">Graded</th>
                                <th className="font-medium px-3 py-2 text-right">Submitted</th>
                            </tr>
                        </thead>
                        <tbody>
                            {insight.assessments.map(function(assessment) {
                                return (
                                    <tr
                                        className="border-b border-(--mui-palette-divider) last:border-b-0"
                                        key={assessment.assessment_id}
                                    >
                                        <td className="px-3 py-2 text-(--mui-palette-text-primary)">
                                            {assessment.title}
                                        </td>
                                        <td className="px-3 py-2 text-(--mui-palette-text-secondary)">
                                            {assessment.assessment_type}
                                        </td>
                                        <td className="px-3 py-2 text-(--mui-palette-text-primary) text-right">
                                            {formatPct(assessment.avg_score_pct)}
                                        </td>
                                        <td className="px-3 py-2 text-(--mui-palette-text-primary) text-right">
                                            {formatPct(assessment.highest_pct)}
                                        </td>
                                        <td className="px-3 py-2 text-(--mui-palette-text-primary) text-right">
                                            {formatPct(assessment.lowest_pct)}
                                        </td>
                                        <td className="px-3 py-2 text-(--mui-palette-text-primary) text-right">
                                            {assessment.graded_count}
                                        </td>
                                        <td className="px-3 py-2 text-(--mui-palette-text-primary) text-right">
                                            {formatPct(assessment.submission_rate)}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
                {insight.assessments.length === 0 && (
                    <p className="text-(--mui-palette-text-secondary) text-sm">
                        No published assessments yet.
                    </p>
                )}
            </div>
        </div>
    );
}