import { CommonBadgeStatus } from '@components/badge/CommonBadgeStatus';
import { CommonChip } from '@components/badge/CommonChip';
import InsightStatTile from '@pages/shared/analytics/InsightStatTile';
import { getAssessmentItemAnalysis } from '@services/analytics.service';
import { AssessmentItemAnalysis, ItemAnalysisQuestion } from '@type/analytics.type';
import { useEffect, useState } from 'react';

interface ItemAnalysisViewProps {
    assessmentId: string;
}

type BadgeVariant = 'success' | 'error' | 'warning' | 'info';

const DIFFICULTY_VARIANT_MAP: Record<string, BadgeVariant> = {
    Difficult: 'error',
    Easy: 'success',
    Moderate: 'warning'
};

const DISCRIMINATION_VARIANT_MAP: Record<string, BadgeVariant> = {
    Excellent: 'success',
    Fair: 'warning',
    Good: 'info',
    Poor: 'error'
};

function formatPct(value: number | null): string {
    return value !== null && value !== undefined
        ? `${Number(value)
            .toFixed(1)}%`
        : '—';
}

function formatIndex(value: number | null): string {
    return value !== null && value !== undefined
        ? Number(value)
            .toFixed(2)
        : '—';
}

interface QuestionCardProps {
    question: ItemAnalysisQuestion;
}

function QuestionCard({ question }: QuestionCardProps) {
    return (
        <div className="border border-(--mui-palette-divider) flex flex-col gap-3 p-4 rounded-lg">
            <div className="flex flex-wrap gap-3 items-start justify-between">
                <div className="flex flex-col gap-1 min-w-0">
                    <span className="text-(--mui-palette-text-secondary) text-xs uppercase">
                        Question {question.sequence} · {question.question_type} · {Number(question.points)} pt(s)
                    </span>
                    <span className="text-(--mui-palette-text-primary) text-sm">
                        {question.question_text}
                    </span>
                    {question.competencies.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                            {question.competencies.map(function(competency) {
                                return (
                                    <CommonChip
                                        key={competency.code}
                                        label={competency.code}
                                        size="small"
                                        variant="outline"
                                    />
                                );
                            })}
                        </div>
                    )}
                </div>
                <div className="flex gap-2">
                    {question.difficulty_label && (
                        <CommonBadgeStatus
                            label={`${question.difficulty_label} · p=${formatIndex(question.difficulty_index)}`}
                            variant={DIFFICULTY_VARIANT_MAP[question.difficulty_label] ?? 'info'}
                        />
                    )}
                    {question.discrimination_label && (
                        <CommonBadgeStatus
                            label={`${question.discrimination_label} · D=${formatIndex(question.discrimination_index)}`}
                            variant={DISCRIMINATION_VARIANT_MAP[question.discrimination_label] ?? 'info'}
                        />
                    )}
                </div>
            </div>

            <div className="flex flex-wrap gap-4">
                <span className="text-(--mui-palette-text-secondary) text-xs">
                    Answered by {question.answered_count}
                </span>
                <span className="text-(--mui-palette-text-secondary) text-xs">
                    Correct: {question.correct_count}
                </span>
            </div>

            {question.choices.length > 0 && (
                <div className="flex flex-col gap-1">
                    {question.choices.map(function(choice) {
                        const share = question.answered_count > 0
                            ? choice.selected_count / question.answered_count * 100
                            : 0;

                        return (
                            <div
                                className="flex gap-3 items-center"
                                key={choice.choice_id}
                            >
                                <span
                                    className={choice.is_correct
                                        ? 'font-medium text-(--mui-palette-success-main) text-sm w-1/3'
                                        : 'text-(--mui-palette-text-secondary) text-sm w-1/3'}
                                >
                                    {choice.choice_text}
                                </span>
                                <div className="bg-(--mui-palette-action-hover) flex-1 h-2 overflow-hidden rounded">
                                    <div
                                        className="h-full rounded"
                                        style={{
                                            backgroundColor: choice.is_correct
                                                ? 'var(--mui-palette-success-main)'
                                                : 'var(--mui-palette-text-disabled)',
                                            width: `${share}%`
                                        }}
                                    />
                                </div>
                                <span className="text-(--mui-palette-text-secondary) text-xs w-16">
                                    {choice.selected_count} ({share.toFixed(0)}%)
                                </span>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

export default function ItemAnalysisView({ assessmentId }: ItemAnalysisViewProps) {
    const [analysis, setAnalysis] = useState<AssessmentItemAnalysis | null>(null);
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(function() {
        async function fetchAnalysis() {
            const result = await getAssessmentItemAnalysis(assessmentId);
            if (result.data) setAnalysis(result.data);
            setIsLoaded(true);
        }

        fetchAnalysis();
    }, [assessmentId]);

    if (!isLoaded) {
        return (
            <p className="text-(--mui-palette-text-secondary) text-sm">
                Loading...
            </p>
        );
    }

    if (!analysis || !analysis.success) {
        return (
            <p className="text-(--mui-palette-text-secondary) text-sm">
                {analysis?.message ?? 'Item analysis is not available.'}
            </p>
        );
    }

    const { summary } = analysis;

    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-col">
                <h1 className="font-semibold text-(--mui-palette-text-primary) text-xl">
                    Item Analysis
                </h1>
                <span className="text-(--mui-palette-text-secondary) text-sm">
                    {analysis.assessment.title} · {analysis.assessment.course_code} · {analysis.assessment.section_code}
                </span>
            </div>

            <div className="gap-3 grid grid-cols-2 md:grid-cols-5">
                <InsightStatTile
                    label="Submissions"
                    value={String(summary.submission_count)}
                />
                <InsightStatTile
                    label="Mean"
                    value={formatPct(summary.mean_pct)}
                />
                <InsightStatTile
                    label="Median"
                    value={formatPct(summary.median_pct)}
                />
                <InsightStatTile
                    hint={`Low ${formatPct(summary.lowest_pct)}`}
                    label="High"
                    value={formatPct(summary.highest_pct)}
                />
                <InsightStatTile
                    hint={`Upper/lower group size ${summary.group_size}`}
                    label="Std Dev"
                    value={formatPct(summary.std_dev_pct)}
                />
            </div>

            <div className="flex flex-col gap-3">
                <div className="flex gap-2 items-baseline justify-between">
                    <h2 className="font-semibold text-(--mui-palette-text-primary) text-base">
                        Questions
                    </h2>
                    <span className="text-(--mui-palette-text-secondary) text-xs">
                        p = difficulty (share of points earned) · D = discrimination (top 27% minus bottom 27%)
                    </span>
                </div>
                {analysis.questions.length > 0
                    ? (
                        <div className="flex flex-col gap-3">
                            {analysis.questions.map(function(question) {
                                return (
                                    <QuestionCard
                                        key={question.question_id}
                                        question={question}
                                    />
                                );
                            })}
                        </div>
                    )
                    : (
                        <p className="text-(--mui-palette-text-secondary) text-sm">
                            This assessment has no questions.
                        </p>
                    )}
            </div>
        </div>
    );
}