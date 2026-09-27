import { CommonBadgeStatus } from '@components/badge/CommonBadgeStatus';
import InsightStatTile from '@pages/shared/analytics/InsightStatTile';
import { getAssessmentItemAnalysis } from '@services/analytics.service';
import { AssessmentItemAnalysis, ItemAnalysisQuestion } from '@type/analytics.type';
import { useEffect, useState } from 'react';

interface ItemAnalysisViewProps {
    assessmentId: string;
}

function formatPct(value: number | null): string {
    return value !== null && value !== undefined
        ? `${Number(value).toFixed(1)}%`
        : '—';
}

interface QuestionCardProps {
    question: ItemAnalysisQuestion;
}

function QuestionCard({ question }: QuestionCardProps) {
    const passRate = question.answered_count > 0
        ? Math.round((question.correct_count / question.answered_count) * 100)
        : 0;

    return (
        <div className="border border-(--mui-palette-divider) flex flex-col gap-3 p-4 rounded-lg">
            <div className="flex flex-wrap gap-3 items-start justify-between">
                <div className="flex flex-col gap-1 min-w-0">
                    <span className="text-(--mui-palette-text-secondary) text-xs uppercase font-medium">
                        Question {question.sequence} · {question.question_type} · {Number(question.points)} pt(s)
                    </span>
                    <span className="text-(--mui-palette-text-primary) text-sm font-medium">
                        {question.question_text}
                    </span>
                </div>
                <div className="flex gap-2">
                    <CommonBadgeStatus
                        label={`Pass Rate: ${passRate}%`}
                        variant={passRate >= 75 ? 'success' : passRate >= 50 ? 'warning' : 'error'}
                    />
                </div>
            </div>

            <div className="flex flex-wrap gap-4">
                <span className="text-(--mui-palette-text-secondary) text-xs">
                    Answered: {question.answered_count} student(s)
                </span>
                <span className="text-(--mui-palette-text-secondary) text-xs">
                    Correct: {question.correct_count} ({passRate}%)
                </span>
            </div>

            {question.choices.length > 0 && (
                <div className="flex flex-col gap-1 mt-1">
                    {question.choices.map(function(choice) {
                        const share = question.answered_count > 0
                            ? (choice.selected_count / question.answered_count) * 100
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
                                    {choice.choice_text} {choice.is_correct && '✓'}
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
                Loading assessment summary...
            </p>
        );
    }

    if (!analysis || !analysis.success) {
        return (
            <p className="text-(--mui-palette-text-secondary) text-sm">
                {analysis?.message ?? 'Assessment summary is not available.'}
            </p>
        );
    }

    const { summary } = analysis;
    const totalQuestions = analysis.questions.length;
    const answeredQuestions = analysis.questions.filter((q) => q.answered_count > 0);
    const overallPassRate = answeredQuestions.length > 0
        ? Math.round(
            answeredQuestions.reduce(
                (acc, q) => acc + (q.answered_count > 0 ? (q.correct_count / q.answered_count) * 100 : 0),
                0
            ) / answeredQuestions.length
        )
        : 0;

    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-col">
                <h1 className="font-semibold text-(--mui-palette-text-primary) text-xl">
                    Assessment Summary
                </h1>
                <span className="text-(--mui-palette-text-secondary) text-sm">
                    {analysis.assessment.title} · {analysis.assessment.course_code} · {analysis.assessment.section_code}
                </span>
            </div>

            <div className="gap-3 grid grid-cols-2 md:grid-cols-4">
                <InsightStatTile
                    label="Submissions"
                    value={String(summary.submission_count)}
                />
                <InsightStatTile
                    label="Average Score"
                    value={formatPct(summary.mean_pct)}
                />
                <InsightStatTile
                    label="Pass Rate"
                    value={`${overallPassRate}%`}
                />
                <InsightStatTile
                    hint={`Lowest: ${formatPct(summary.lowest_pct)}`}
                    label="Highest Score"
                    value={formatPct(summary.highest_pct)}
                />
            </div>

            <div className="flex flex-col gap-3">
                <div className="flex gap-2 items-baseline justify-between">
                    <h2 className="font-semibold text-(--mui-palette-text-primary) text-base">
                        Question Breakdown ({totalQuestions})
                    </h2>
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