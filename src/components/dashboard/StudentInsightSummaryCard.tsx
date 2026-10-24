import { CommonBadgeStatus } from '@components/badge/CommonBadgeStatus';
import CommonButton from '@components/button/CommonButton';
import CommonCard from '@components/card/CommonCard';
import {
    CalendarCheckIcon,
    GraduationCapIcon,
    ShieldCheckIcon,
    TargetIcon,
    WarningCircleIcon
} from '@phosphor-icons/react';
import { RiskLevel, StudentInsight } from '@type/analytics.type';
import { ReactNode } from 'react';

const RISK_VARIANT: Record<RiskLevel, 'success' | 'warning' | 'error'> = {
    Low: 'success',
    Moderate: 'warning',
    High: 'error'
};

interface StudentInsightSummaryCardProps {
    insight: StudentInsight | null;
    onViewInsight: VoidFunction;
}

interface InsightStatItem {
    icon: ReactNode;
    iconBg: string;
    iconColor: string;
    label: string;
    value: ReactNode;
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

    const riskLevel = insight?.risk.risk_level;
    const riskBg = riskLevel === 'High'
        ? 'bg-(--mui-palette-error-light)'
        : riskLevel === 'Moderate'
            ? 'bg-(--mui-palette-warning-light)'
            : 'bg-(--mui-palette-success-light)';
    const riskColor = riskLevel === 'High'
        ? 'text-(--mui-palette-error-main)'
        : riskLevel === 'Moderate'
            ? 'text-(--mui-palette-warning-main)'
            : 'text-(--mui-palette-success-main)';

    const statItems: InsightStatItem[] = [
        {
            icon: <GraduationCapIcon size={22} />,
            iconBg: 'bg-(--mui-palette-primary-light)',
            iconColor: 'text-(--mui-palette-primary-main)',
            label: 'Cumulative GWA',
            value: (
                <span className="font-bold text-lg sm:text-xl text-(--mui-palette-text-primary) truncate">
                    {formatMetric(insight?.academic?.cumulative_gwa ?? null, '')}
                </span>
            )
        },
        {
            icon: <TargetIcon size={22} />,
            iconBg: 'bg-(--mui-palette-info-light)',
            iconColor: 'text-(--mui-palette-info-main)',
            label: 'Average Score',
            value: (
                <span className="font-bold text-lg sm:text-xl text-(--mui-palette-text-primary) truncate">
                    {formatMetric(insight?.performance?.avg_score_pct ?? null, '%')}
                </span>
            )
        },
        {
            icon: <CalendarCheckIcon size={22} />,
            iconBg: 'bg-(--mui-palette-success-light)',
            iconColor: 'text-(--mui-palette-success-main)',
            label: 'Attendance',
            value: (
                <span className="font-bold text-lg sm:text-xl text-(--mui-palette-text-primary) truncate">
                    {formatMetric(insight?.engagement?.attendance_rate ?? null, '%')}
                </span>
            )
        },
        {
            icon: riskLevel === 'High' ? <WarningCircleIcon size={22} /> : <ShieldCheckIcon size={22} />,
            iconBg: riskBg,
            iconColor: riskColor,
            label: 'Risk Level',
            value: insight ? (
                <CommonBadgeStatus
                    label={insight.risk.risk_level}
                    variant={RISK_VARIANT[insight.risk.risk_level]}
                />
            ) : (
                <span className="font-bold text-lg sm:text-xl text-(--mui-palette-text-primary) truncate">
                    —
                </span>
            )
        }
    ];

    return (
        <CommonCard
            cardHeaderProps={{
                action: (
                    <CommonButton
                        color="primary"
                        size="small"
                        variant="text"
                        onClick={onViewInsight}
                    >
                        View all
                    </CommonButton>
                ),
                subheader: 'How you are tracking this term.',
                title: 'Academic Insights'
            }}
            className="flex flex-col"
        >
            <div className="flex flex-col gap-3 p-4 pt-0">
                <div className="gap-3 grid grid-cols-2 lg:grid-cols-4">
                    {statItems.map((item) => (
                        <div
                            className="border border-(--mui-palette-divider) flex items-center gap-3 p-3 rounded-lg min-w-0"
                            key={item.label}
                        >
                            <div
                                className={`flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-xl ${item.iconBg}`}
                            >
                                <span className={item.iconColor}>
                                    {item.icon}
                                </span>
                            </div>
                            <div className="flex flex-col gap-0.5 min-w-0 text-left">
                                <div className="truncate">
                                    {item.value}
                                </div>
                                <span className="text-xs text-(--mui-palette-text-secondary) truncate">
                                    {item.label}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>

                {topFocus && (
                    <div className="border border-(--mui-palette-divider) flex gap-3 items-center p-3 rounded-lg">
                        <div className="bg-(--mui-palette-primary-light) flex h-9 w-9 items-center justify-center rounded-lg shrink-0">
                            <TargetIcon
                                className="text-(--mui-palette-primary-main)"
                                size={18}
                                weight="bold"
                            />
                        </div>
                        <div className="flex flex-col gap-0.5 min-w-0">
                            <span className="font-medium text-(--mui-palette-text-primary) text-sm truncate">
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
                        <div className="gap-2 sm:gap-3 grid grid-cols-1 sm:grid-cols-3">
                            {weaknesses.map((entry) => (
                                <div
                                    className="border border-(--mui-palette-divider) flex gap-3 items-center justify-between p-3 rounded-lg min-w-0"
                                    key={entry.key}
                                >
                                    <span className="font-medium text-(--mui-palette-text-primary) text-sm truncate">
                                        {entry.label}
                                    </span>
                                    <span className="font-semibold shrink-0 text-(--mui-palette-error-main) text-xs">
                                        {formatMetric(entry.score_pct, '%')}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </CommonCard>
    );
}
