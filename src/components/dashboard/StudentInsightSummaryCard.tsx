import { CommonBadgeStatus } from '@components/badge/CommonBadgeStatus';
import CommonButton from '@components/button/CommonButton';
import CommonCard from '@components/card/CommonCard';
import { ArrowRightIcon, TargetIcon } from '@phosphor-icons/react';
import { RiskLevel, StudentInsight } from '@type/analytics.type';

const RISK_VARIANT: Record<RiskLevel, 'success' | 'warning' | 'error'> = {
    Low: 'success',
    Moderate: 'warning',
    High: 'error'
};

interface StudentInsightSummaryCardProps {
    insight: StudentInsight | null;
    onViewInsight: VoidFunction;
}

function formatMetric(value: number | null, suffix: string): string {
    if (value === null) {
        return '—';
    }

    return `${value}${suffix}`;
}

export default function StudentInsightSummaryCard({
    insight,
    onViewInsight
}: StudentInsightSummaryCardProps) {
    const topFocus = insight?.recommended_focus?.[0] ?? null;
    const weaknesses = insight?.performance?.weaknesses?.slice(0, 3) ?? [];

    const qualified = insight?.trajectories?.find((t) => t.is_currently_qualified && !t.is_blocked_by_failing);
    const attainable = insight?.trajectories?.find((t) => !t.is_currently_qualified && t.is_attainable !== false && !t.is_blocked_by_failing);
    const hasFailing = (insight?.academic?.failing_count ?? 0) > 0;

    const standingLabel = hasFailing
        ? 'Deficiency'
        : qualified
            ? qualified.label
            : attainable
                ? `${attainable.label} Track`
                : 'Good Standing';
    const standingVariant: 'success' | 'warning' | 'error' | 'info' = hasFailing
        ? 'error'
        : qualified
            ? 'success'
            : attainable
                ? 'warning'
                : 'info';

    return (
        <CommonCard
            cardHeaderProps={{
                action: (
                    <CommonButton
                        endIcon={<ArrowRightIcon size={16} />}
                        size="small"
                        variant="text"
                        onClick={onViewInsight}
                    >
                        View Insight
                    </CommonButton>
                ),
                subheader: 'Academic standing & honors performance overview.',
                title: 'Academic & Honors Insight'
            }}
            className="flex flex-col"
        >
            <div className="flex flex-col gap-4 p-4 pt-0">
                <div className="gap-3 grid grid-cols-2 md:grid-cols-4">
                    <div className="flex flex-col gap-0.5">
                        <span className="font-bold text-(--mui-palette-text-primary) text-xl">
                            {formatMetric(insight?.academic?.cumulative_gwa ?? null, '')}
                        </span>
                        <span className="text-(--mui-palette-text-secondary) text-xs">
                            Cumulative GWA
                        </span>
                    </div>
                    <div className="flex flex-col gap-0.5">
                        <span className="font-bold text-(--mui-palette-text-primary) text-xl">
                            {formatMetric(insight?.performance?.avg_score_pct ?? null, '%')}
                        </span>
                        <span className="text-(--mui-palette-text-secondary) text-xs">
                            Average Score
                        </span>
                    </div>
                    <div className="flex flex-col gap-0.5">
                        <span className="font-bold text-(--mui-palette-text-primary) text-xl">
                            {formatMetric(insight?.engagement?.attendance_rate ?? null, '%')}
                        </span>
                        <span className="text-(--mui-palette-text-secondary) text-xs">
                            Attendance
                        </span>
                    </div>
                    <div className="flex flex-col gap-1 items-start">
                        {insight
                            ? (
                                <CommonBadgeStatus
                                    label={standingLabel}
                                    variant={standingVariant}
                                />
                            )
                            : (
                                <span className="font-bold text-(--mui-palette-text-primary) text-xl">
                                    —
                                </span>
                            )
                        }
                        <span className="text-(--mui-palette-text-secondary) text-xs">
                            Honors Track
                        </span>
                    </div>
                </div>

                {topFocus && (
                    <div className="bg-(--mui-palette-primary-light) flex gap-3 items-start p-3 rounded-lg">
                        <TargetIcon
                            className="shrink-0 text-(--mui-palette-primary-main)"
                            size={18}
                            weight="bold"
                        />
                        <div className="flex flex-col gap-0.5 min-w-0">
                            <span className="font-medium text-(--mui-palette-text-primary) text-sm">
                                {topFocus.title}
                            </span>
                            <span className="text-(--mui-palette-text-secondary) text-xs">
                                {topFocus.detail}
                            </span>
                        </div>
                    </div>
                )}

                {weaknesses.length > 0 && (
                    <div className="flex flex-col gap-2">
                        <span className="font-medium text-(--mui-palette-text-primary) text-sm">
                            Weakest Areas
                        </span>
                        {weaknesses.map((entry) => (
                            <div
                                className="flex gap-3 items-center justify-between"
                                key={entry.key}
                            >
                                <span className="text-(--mui-palette-text-secondary) text-xs truncate">
                                    {entry.label}
                                </span>
                                <span className="font-semibold shrink-0 text-(--mui-palette-error-main) text-xs">
                                    {formatMetric(entry.score_pct, '%')}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </CommonCard>
    );
}