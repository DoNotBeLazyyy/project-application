import { CommonBadgeStatus } from '@components/badge/CommonBadgeStatus';
import MasteryBarList from '@pages/shared/analytics/MasteryBarList';
import {
    CalendarCheckIcon,
    TargetIcon,
    UsersThreeIcon,
    WarningCircleIcon
} from '@phosphor-icons/react';
import { getSectionInsight } from '@services/analytics.service';
import { RiskLevel, ScoreDistributionBucket, SectionInsight, SectionInsightStudent } from '@type/analytics.type';
import { ReactNode, useEffect, useState } from 'react';

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
        ? `${Number(value).toFixed(1)}%`
        : '—';
}

interface SectionMetricCardProps {
    hint?: string;
    icon: ReactNode;
    iconBg: string;
    iconColor: string;
    label: string;
    value: string;
}

function SectionMetricCard({ hint, icon, iconBg, iconColor, label, value }: SectionMetricCardProps) {
    return (
        <div className="bg-slate-50/70 dark:bg-zinc-800/60 border border-slate-200/80 dark:border-zinc-800 flex items-center gap-3.5 p-3.5 sm:p-4 rounded-2xl shadow-2xs min-w-0 transition-all">
            <div className={`flex h-11 w-11 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-xl ${iconBg}`}>
                <span className={`flex items-center justify-center ${iconColor}`}>
                    {icon}
                </span>
            </div>
            <div className="flex flex-col gap-0.5 min-w-0 text-left">
                <span className="font-bold text-xl sm:text-2xl text-slate-900 dark:text-slate-100 truncate tracking-tight">
                    {value}
                </span>
                <span className="font-medium text-xs sm:text-sm text-slate-700 dark:text-slate-300 truncate">
                    {label}
                </span>
                {hint && (
                    <span className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 truncate">
                        {hint}
                    </span>
                )}
            </div>
        </div>
    );
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
            <div className="py-12 text-center text-slate-500 text-sm italic border border-slate-200/80 dark:border-zinc-800 rounded-xl bg-slate-50/50 dark:bg-zinc-900/50">
                No graded assessments recorded yet.
            </div>
        );
    }

    return (
        <div className="bg-slate-50/60 dark:bg-zinc-800/40 border border-slate-200/80 dark:border-zinc-800 p-4 rounded-xl flex flex-col gap-3">
            <div className="flex gap-2 sm:gap-3 h-44 items-end pt-4">
                {buckets.map(function(bucket) {
                    const heightPct = (bucket.student_count / maxCount) * 100;

                    return (
                        <div
                            className="flex flex-1 flex-col gap-1.5 h-full items-center justify-end group"
                            key={bucket.bucket}
                        >
                            <span className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                                {bucket.student_count}
                            </span>
                            <div className="w-full bg-slate-200/60 dark:bg-zinc-700 rounded-t-lg h-full flex items-end overflow-hidden">
                                <div
                                    className="bg-blue-600 dark:bg-blue-500 group-hover:bg-blue-500 transition-all rounded-t-lg w-full"
                                    style={{ height: `${Math.max(heightPct, 4)}%` }}
                                    title={`${bucket.bucket}: ${bucket.student_count} students`}
                                />
                            </div>
                            <span className="text-slate-500 dark:text-slate-400 text-[11px] font-medium truncate">
                                {bucket.bucket}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

interface StudentRowProps {
    student: SectionInsightStudent;
}

function StudentRow({ student }: StudentRowProps) {
    return (
        <tr className="border-b border-slate-100 dark:border-zinc-800/60 last:border-b-0 hover:bg-slate-50/70 dark:hover:bg-zinc-800/40 transition-colors">
            <td className="font-mono px-4 py-3 text-slate-700 dark:text-slate-300 text-xs sm:text-sm whitespace-nowrap">
                {student.student_number}
            </td>
            <td className="font-medium px-4 py-3 text-slate-900 dark:text-slate-100 text-sm">
                {student.full_name}
            </td>
            <td className="px-4 py-3 text-slate-700 dark:text-slate-300 text-right text-xs sm:text-sm">
                {formatPct(student.avg_score_pct)}
            </td>
            <td className="px-4 py-3 text-slate-700 dark:text-slate-300 text-right text-xs sm:text-sm">
                {formatPct(student.attendance_rate)}
            </td>
            <td className="px-4 py-3 text-right text-xs sm:text-sm">
                <span
                    className={student.missing_count > 0
                        ? 'font-bold text-rose-600 dark:text-rose-400'
                        : 'text-slate-500 dark:text-slate-400'}
                >
                    {student.missing_count}
                </span>
            </td>
            <td className="font-mono font-semibold px-4 py-3 text-slate-900 dark:text-slate-100 text-right text-xs sm:text-sm">
                {Number(student.risk_score).toFixed(0)}
            </td>
            <td className="px-4 py-3">
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
            <div className="py-16 text-center text-slate-500 dark:text-slate-400 text-sm">
                Loading section insight analytics…
            </div>
        );
    }

    if (!insight || !insight.success) {
        return (
            <div className="py-16 text-center text-slate-500 dark:text-slate-400 text-sm">
                {insight?.message ?? 'Section analytics currently unavailable.'}
            </div>
        );
    }

    const { mastery, summary } = insight;
    const isFine = mastery.granularity === 'fine';
    const atRisk = insight.students.filter(function(student) {
        return student.is_at_risk;
    });

    return (
        <div className="flex flex-col gap-6 h-full overflow-y-auto pr-1">
            {/* Top Metric Cards Grid */}
            <div className="gap-3 sm:gap-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                <SectionMetricCard
                    icon={<UsersThreeIcon size={24} />}
                    iconBg="bg-blue-50 dark:bg-blue-950/60"
                    iconColor="text-blue-600 dark:text-blue-400"
                    label="Total Enrolled"
                    value={String(summary.enrolled_count)}
                />
                <SectionMetricCard
                    hint="Risk score ≥ 30"
                    icon={<WarningCircleIcon size={24} />}
                    iconBg={summary.at_risk_count > 0 ? 'bg-rose-50 dark:bg-rose-950/60' : 'bg-emerald-50 dark:bg-emerald-950/60'}
                    iconColor={summary.at_risk_count > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}
                    label="At-Risk Students"
                    value={String(summary.at_risk_count)}
                />
                <SectionMetricCard
                    hint="Across graded assessments"
                    icon={<TargetIcon size={24} />}
                    iconBg="bg-indigo-50 dark:bg-indigo-950/60"
                    iconColor="text-indigo-600 dark:text-indigo-400"
                    label="Cohort Average"
                    value={formatPct(summary.avg_score_pct)}
                />
                <SectionMetricCard
                    hint={`Submission rate: ${formatPct(summary.submission_rate)}`}
                    icon={<CalendarCheckIcon size={24} />}
                    iconBg="bg-emerald-50 dark:bg-emerald-950/60"
                    iconColor="text-emerald-600 dark:text-emerald-400"
                    label="Cohort Attendance"
                    value={formatPct(summary.avg_attendance_rate)}
                />
            </div>

            {/* Competency Mastery Gaps */}
            <div className="flex flex-col gap-3">
                <div className="flex flex-wrap gap-2 items-baseline justify-between">
                    <h2 className="font-bold text-slate-900 dark:text-slate-100 text-base sm:text-lg tracking-tight">
                        {isFine
                            ? 'Competency Mastery Gaps'
                            : 'Mastery Gaps by Assessment Type'}
                    </h2>
                    <span className="text-slate-500 dark:text-slate-400 text-xs">
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

            {/* Score Distribution & Competencies Grid */}
            <div className="gap-6 grid grid-cols-1 lg:grid-cols-2">
                <div className="flex flex-col gap-3">
                    <h2 className="font-bold text-slate-900 dark:text-slate-100 text-base sm:text-lg tracking-tight">
                        Score Distribution
                    </h2>
                    <DistributionChart buckets={insight.score_distribution} />
                </div>
                <div className="flex flex-col gap-3">
                    <h2 className="font-bold text-slate-900 dark:text-slate-100 text-base sm:text-lg tracking-tight">
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

            {/* At-Risk Students Table */}
            <div className="flex flex-col gap-3">
                <div className="flex flex-wrap gap-2 items-baseline justify-between">
                    <h2 className="font-bold text-slate-900 dark:text-slate-100 text-base sm:text-lg tracking-tight">
                        At-Risk Student Monitoring
                    </h2>
                    <span className="font-medium text-xs px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-slate-300">
                        {atRisk.length} of {insight.students.length} flagged
                    </span>
                </div>
                <div className="border border-slate-200/90 dark:border-zinc-800 overflow-x-auto rounded-xl bg-white dark:bg-zinc-900 shadow-2xs">
                    <table className="text-sm w-full">
                        <thead>
                            <tr className="border-b border-slate-200/70 dark:border-zinc-800 text-slate-500 dark:text-slate-400 text-xs uppercase bg-slate-50/40 dark:bg-zinc-900/40">
                                <th className="font-semibold px-4 py-2.5 text-left">Student No.</th>
                                <th className="font-semibold px-4 py-2.5 text-left">Full Name</th>
                                <th className="font-semibold px-4 py-2.5 text-right">Avg Score</th>
                                <th className="font-semibold px-4 py-2.5 text-right">Attendance</th>
                                <th className="font-semibold px-4 py-2.5 text-right">Missing</th>
                                <th className="font-semibold px-4 py-2.5 text-right">Risk Score</th>
                                <th className="font-semibold px-4 py-2.5 text-left">Level</th>
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
                    <p className="text-slate-500 text-sm italic py-4">
                        No students are enrolled in this section.
                    </p>
                )}
            </div>

            {/* Assessment Performance Roster */}
            <div className="flex flex-col gap-3">
                <h2 className="font-bold text-slate-900 dark:text-slate-100 text-base sm:text-lg tracking-tight">
                    Assessment Performance Breakdown
                </h2>
                <div className="border border-slate-200/90 dark:border-zinc-800 overflow-x-auto rounded-xl bg-white dark:bg-zinc-900 shadow-2xs">
                    <table className="text-sm w-full">
                        <thead>
                            <tr className="border-b border-slate-200/70 dark:border-zinc-800 text-slate-500 dark:text-slate-400 text-xs uppercase bg-slate-50/40 dark:bg-zinc-900/40">
                                <th className="font-semibold px-4 py-2.5 text-left">Assessment Title</th>
                                <th className="font-semibold px-4 py-2.5 text-left">Type</th>
                                <th className="font-semibold px-4 py-2.5 text-right">Average</th>
                                <th className="font-semibold px-4 py-2.5 text-right">High</th>
                                <th className="font-semibold px-4 py-2.5 text-right">Low</th>
                                <th className="font-semibold px-4 py-2.5 text-right">Graded</th>
                                <th className="font-semibold px-4 py-2.5 text-right">Submission Rate</th>
                            </tr>
                        </thead>
                        <tbody>
                            {insight.assessments.map(function(assessment) {
                                return (
                                    <tr
                                        className="border-b border-slate-100 dark:border-zinc-800/60 last:border-b-0 hover:bg-slate-50/70 dark:hover:bg-zinc-800/40 transition-colors"
                                        key={assessment.assessment_id}
                                    >
                                        <td className="font-medium px-4 py-3 text-slate-900 dark:text-slate-100">
                                            {assessment.title}
                                        </td>
                                        <td className="px-4 py-3 text-slate-500 dark:text-slate-400 text-xs">
                                            {assessment.assessment_type}
                                        </td>
                                        <td className="font-mono font-semibold px-4 py-3 text-slate-900 dark:text-slate-100 text-right text-xs sm:text-sm">
                                            {formatPct(assessment.avg_score_pct)}
                                        </td>
                                        <td className="font-mono px-4 py-3 text-emerald-600 dark:text-emerald-400 text-right text-xs sm:text-sm">
                                            {formatPct(assessment.highest_pct)}
                                        </td>
                                        <td className="font-mono px-4 py-3 text-rose-600 dark:text-rose-400 text-right text-xs sm:text-sm">
                                            {formatPct(assessment.lowest_pct)}
                                        </td>
                                        <td className="px-4 py-3 text-slate-700 dark:text-slate-300 text-right text-xs sm:text-sm">
                                            {assessment.graded_count}
                                        </td>
                                        <td className="font-mono px-4 py-3 text-blue-600 dark:text-blue-400 text-right text-xs sm:text-sm">
                                            {formatPct(assessment.submission_rate)}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
                {insight.assessments.length === 0 && (
                    <p className="text-slate-500 text-sm italic py-4">
                        No published assessments recorded yet.
                    </p>
                )}
            </div>
        </div>
    );
}
