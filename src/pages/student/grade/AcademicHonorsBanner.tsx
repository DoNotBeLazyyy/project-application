import { CommonBadgeStatus } from '@components/badge/CommonBadgeStatus';
import CommonButton from '@components/button/CommonButton';
import { ArrowRightIcon, ChatCircleDotsIcon, GraduationCapIcon, SparkleIcon, TrophyIcon } from '@phosphor-icons/react';
import { useAssistantStore } from '@stores/assistant.store';
import { InsightTrajectory, StudentInsight } from '@type/analytics.type';
import { useNavigate } from 'react-router-dom';

interface AcademicHonorsBannerProps {
    insight: StudentInsight | null;
    isLoading?: boolean;
}

function formatGwa(value: number | null | undefined): string {
    return value !== null && value !== undefined
        ? Number(value).toFixed(2)
        : '—';
}

export default function AcademicHonorsBanner({ insight, isLoading }: AcademicHonorsBannerProps) {
    const navigate = useNavigate();
    const setIsAssistantOpen = useAssistantStore((s) => s.setIsOpen);

    if (isLoading) {
        return (
            <div className="animate-pulse bg-(--mui-palette-action-hover) h-36 rounded-xl w-full" />
        );
    }

    if (!insight) {
        return null;
    }

    const { academic, trajectories = [] } = insight;
    const cumulativeGwa = academic?.cumulative_gwa ?? null;
    const earnedUnits = academic?.earned_units ?? 0;
    const failingCount = academic?.failing_count ?? 0;

    // Find the highest qualified honor target, or the closest attainable target
    const qualifiedTrajectory: InsightTrajectory | undefined = trajectories.find(
        (t) => t.is_currently_qualified && !t.is_blocked_by_failing
    );
    const attainableTrajectory: InsightTrajectory | undefined = trajectories.find(
        (t) => !t.is_currently_qualified && t.is_attainable !== false && !t.is_blocked_by_failing
    );

    let statusLabel = 'Regular Standing';
    let statusVariant: 'success' | 'warning' | 'error' | 'info' = 'info';
    let targetNote = 'Keep completing courses with passing marks (≤ 3.00) to raise your standing.';

    if (failingCount > 0) {
        statusLabel = 'Honor Disqualified (Deficiency)';
        statusVariant = 'error';
        targetNote = 'A failing mark or uncompleted deficiency removes Latin honors eligibility for this evaluation cycle.';
    } else if (qualifiedTrajectory) {
        statusLabel = `On Track: ${qualifiedTrajectory.label}`;
        statusVariant = 'success';
        targetNote = `Your cumulative GWA of ${formatGwa(cumulativeGwa)} qualifies for ${qualifiedTrajectory.label} (Threshold: ≤ ${formatGwa(qualifiedTrajectory.target_gwa)}).`;
    } else if (attainableTrajectory) {
        statusLabel = `Within Reach: ${attainableTrajectory.label}`;
        statusVariant = 'warning';
        targetNote = attainableTrajectory.required_avg_on_remaining !== null
            ? `Average ${formatGwa(attainableTrajectory.required_avg_on_remaining)} on your remaining units to qualify for ${attainableTrajectory.label}.`
            : `Target GWA for ${attainableTrajectory.label} is ≤ ${formatGwa(attainableTrajectory.target_gwa)}.`;
    }

    return (
        <div className="bg-gradient-to-r border border-(--mui-palette-divider) flex flex-col from-(--mui-palette-background-paper) gap-4 p-5 relative rounded-2xl shadow-xs to-(--mui-palette-action-hover) w-full">
            <div className="flex flex-wrap gap-3 items-center justify-between">
                <div className="flex gap-3 items-center">
                    <div className="bg-(--mui-palette-primary-main) flex h-10 items-center justify-center rounded-xl shadow-xs text-white w-10">
                        {qualifiedTrajectory ? <TrophyIcon size={22} weight="fill" /> : <GraduationCapIcon size={22} weight="bold" />}
                    </div>
                    <div className="flex flex-col">
                        <span className="font-bold text-(--mui-palette-text-primary) text-base tracking-tight">
                            Academic Honors & Standing
                        </span>
                        <span className="text-(--mui-palette-text-secondary) text-xs">
                            Arellano University collegiate Latin Honors & Dean's List tracking
                        </span>
                    </div>
                </div>

                <div className="flex flex-wrap gap-2 items-center">
                    <CommonBadgeStatus
                        label={statusLabel}
                        variant={statusVariant}
                    />
                    <CommonButton
                        color="primary"
                        size="small"
                        startIcon={<SparkleIcon size={16} weight="fill" />}
                        variant="outlined"
                        onClick={() => setIsAssistantOpen(true)}
                    >
                        Ask AI Advisor
                    </CommonButton>
                </div>
            </div>

            <div className="gap-3 grid grid-cols-2 md:grid-cols-4">
                <div className="bg-(--mui-palette-background-paper) border border-(--mui-palette-divider) flex flex-col gap-0.5 p-3 rounded-xl">
                    <span className="text-(--mui-palette-text-secondary) text-xs">
                        Cumulative GWA
                    </span>
                    <span className="font-black text-(--mui-palette-text-primary) text-2xl tracking-tight">
                        {formatGwa(cumulativeGwa)}
                    </span>
                    <span className="text-(--mui-palette-text-disabled) text-[11px]">
                        Lower is better (1.00 is highest)
                    </span>
                </div>

                <div className="bg-(--mui-palette-background-paper) border border-(--mui-palette-divider) flex flex-col gap-0.5 p-3 rounded-xl">
                    <span className="text-(--mui-palette-text-secondary) text-xs">
                        Units Credited
                    </span>
                    <span className="font-bold text-(--mui-palette-text-primary) text-2xl tracking-tight">
                        {earnedUnits}
                    </span>
                    <span className="text-(--mui-palette-text-disabled) text-[11px]">
                        Completed academic units
                    </span>
                </div>

                <div className="bg-(--mui-palette-background-paper) border border-(--mui-palette-divider) flex flex-col gap-0.5 p-3 rounded-xl">
                    <span className="text-(--mui-palette-text-secondary) text-xs">
                        Target Honor Goal
                    </span>
                    <span className="font-bold text-(--mui-palette-text-primary) text-base truncate">
                        {qualifiedTrajectory?.label ?? attainableTrajectory?.label ?? "Dean's List"}
                    </span>
                    <span className="text-(--mui-palette-text-disabled) text-[11px]">
                        Cutoff: GWA ≤ {formatGwa(qualifiedTrajectory?.target_gwa ?? attainableTrajectory?.target_gwa ?? 1.50)}
                    </span>
                </div>

                <div className="bg-(--mui-palette-background-paper) border border-(--mui-palette-divider) flex flex-col gap-0.5 p-3 rounded-xl">
                    <span className="text-(--mui-palette-text-secondary) text-xs">
                        Active Deficiencies
                    </span>
                    <span className={`font-bold text-2xl tracking-tight ${failingCount > 0 ? 'text-(--mui-palette-error-main)' : 'text-(--mui-palette-success-main)'}`}>
                        {failingCount}
                    </span>
                    <span className="text-(--mui-palette-text-disabled) text-[11px]">
                        {failingCount === 0 ? 'Zero failing or uncompleted grades' : 'Requires academic clearing'}
                    </span>
                </div>
            </div>

            <div className="border-t border-(--mui-palette-divider) flex flex-wrap gap-2 items-center justify-between pt-2">
                <span className="text-(--mui-palette-text-secondary) text-xs">
                    {targetNote}
                </span>
                <button
                    className="cursor-pointer flex font-medium gap-1 hover:underline items-center text-(--mui-palette-primary-main) text-xs"
                    type="button"
                    onClick={() => navigate('/student/insight')}
                >
                    View detailed honors breakdown & projections
                    <ArrowRightIcon size={14} />
                </button>
            </div>
        </div>
    );
}
