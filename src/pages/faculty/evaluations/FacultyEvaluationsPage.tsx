import { CommonBadgeStatus } from '@components/badge/CommonBadgeStatus';
import CommonCard from '@components/card/CommonCard';
import CommonProgressBar from '@components/progress-bar/CommonProgressBar';
import CommonTabMenu from '@components/tab-menu/CommonTabMenu';
import InsightStatTile from '@pages/shared/analytics/InsightStatTile';
import { ChatCircleTextIcon, ListChecksIcon, StarIcon } from '@phosphor-icons/react';
import { getFacultyEvaluationSummary } from '@services/faculty.service';
import { FacultyEvaluationSummary } from '@type/faculty.type';
import { formatShortDate } from '@utils/date.util';
import { SyntheticEvent, useEffect, useState } from 'react';

type EvaluationSubTab = 'questions' | 'comments';

function formatRating(value: number | null): string {
    if (value === null || value === undefined) return '—';
    const formatted = Number(value)
        .toFixed(2);
    return `${formatted} / 5.00`;
}

function resolveRatingVariant(rating: number | null): 'success' | 'warning' | 'error' | 'info' {
    if (rating === null || rating === undefined) return 'info';
    if (rating >= 4.5) return 'success';
    if (rating >= 3.5) return 'info';
    if (rating >= 2.5) return 'warning';
    return 'error';
}

export default function FacultyEvaluationsPage() {
    const [summary, setSummary] = useState<FacultyEvaluationSummary | null>(null);
    const [activeTab, setActiveTab] = useState<EvaluationSubTab>('questions');

    useEffect(function() {
        async function fetchSummary() {
            const result = await getFacultyEvaluationSummary();
            if (result.data) {
                setSummary(result.data);
            }
        }

        fetchSummary();
    }, []);

    function handleTabChange(_: SyntheticEvent, value: string) {
        setActiveTab(value as EvaluationSubTab);
    }

    const totalEvals = summary?.total_evaluations_count ?? 0;
    const dist = summary?.rating_distribution ?? { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    const totalDistCount = dist[1] + dist[2] + dist[3] + dist[4] + dist[5];

    return (
        <CommonCard className="bg-(--mui-palette-background-paper) border border-(--mui-palette-divider) flex flex-col gap-6 min-h-full p-6 rounded-xl shadow-2xs w-full">
            <div className="border-b border-(--mui-palette-divider) flex flex-col gap-1 pb-4">
                <h1 className="font-semibold text-(--mui-palette-text-primary) text-xl">
                    Student Evaluations
                </h1>
                <p className="m-0 text-(--mui-palette-text-secondary) text-sm">
                    Anonymous student performance ratings, itemized teaching feedback, and qualitative suggestions.
                </p>
            </div>

            <div className="gap-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4">
                <InsightStatTile
                    hint="Calculated from student surveys"
                    label="Overall Rating"
                    value={formatRating(summary?.overall_avg_rating ?? null)}
                />
                <InsightStatTile
                    hint="Submitted student evaluation forms"
                    label="Evaluations Count"
                    value={String(totalEvals)}
                />
                <InsightStatTile
                    hint="Ratings of 4.0 or higher"
                    label="5-Star & 4-Star Reviews"
                    value={`${dist[5] + dist[4]} ratings`}
                />
                <InsightStatTile
                    hint="Evaluated teaching sections"
                    label="Active Sections"
                    value={`${summary?.sections.length ?? 0} sections`}
                />
            </div>

            <div className="gap-4 grid grid-cols-1 xl:grid-cols-2">
                <CommonCard
                    cardHeaderProps={{
                        subheader: 'Breakdown of rating scores submitted by students.',
                        title: 'Rating Distribution'
                    }}
                    className="flex flex-col"
                >
                    <div className="flex flex-col gap-3 p-4 pt-0">
                        {[5, 4, 3, 2, 1].map((stars) => {
                            const count = dist[stars as 1 | 2 | 3 | 4 | 5] ?? 0;
                            const pct = totalDistCount > 0
                                ? (count / totalDistCount) * 100
                                : 0;

                            return (
                                <div className="flex gap-3 items-center" key={stars}>
                                    <span className="flex font-medium gap-1 items-center shrink-0 text-(--mui-palette-text-primary) text-sm w-16">
                                        <StarIcon className="text-amber-500" size={16} weight="fill" />
                                        {stars} Stars
                                    </span>
                                    <div className="flex-1 min-w-0">
                                        <CommonProgressBar percentage={pct} type="bar" />
                                    </div>
                                    <span className="shrink-0 text-(--mui-palette-text-secondary) text-xs w-12 text-right">
                                        {count} ({pct.toFixed(0)}%)
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </CommonCard>

                <CommonCard
                    cardHeaderProps={{
                        subheader: 'Average score by course section.',
                        title: 'Section Performance'
                    }}
                    className="flex flex-col"
                >
                    <div className="flex flex-col gap-2 p-4 pt-0">
                        {(!summary?.sections || summary.sections.length === 0) && (
                            <p className="m-0 py-4 text-(--mui-palette-text-secondary) text-sm">
                                No section evaluation scores recorded yet.
                            </p>
                        )}
                        {summary?.sections.map((sec) => (
                            <div
                                className="border border-(--mui-palette-divider) flex gap-3 items-center justify-between p-3 rounded-lg"
                                key={sec.section_id}
                            >
                                <div className="flex flex-col gap-0.5 min-w-0">
                                    <span className="font-medium text-(--mui-palette-text-primary) text-sm truncate">
                                        {sec.course_code} · {sec.section_code}
                                    </span>
                                    <span className="text-(--mui-palette-text-secondary) text-xs truncate">
                                        {sec.course_title} · {sec.evaluations_count} evaluation(s)
                                    </span>
                                </div>
                                <CommonBadgeStatus
                                    label={formatRating(sec.avg_rating)}
                                    variant={resolveRatingVariant(sec.avg_rating)}
                                />
                            </div>
                        ))}
                    </div>
                </CommonCard>
            </div>

            <CommonCard className="flex flex-col gap-4 p-4">
                <CommonTabMenu
                    menuStyle="outline"
                    tabs={[
                        {
                            icon: <ListChecksIcon />,
                            label: 'Question Breakdown',
                            value: 'questions'
                        },
                        {
                            icon: <ChatCircleTextIcon />,
                            label: 'Student Feedback & Comments',
                            value: 'comments'
                        }
                    ]}
                    value={activeTab}
                    onChange={handleTabChange}
                />

                {activeTab === 'questions' && (
                    <div className="flex flex-col gap-2">
                        {(!summary?.questions || summary.questions.length === 0) && (
                            <p className="m-0 py-4 text-(--mui-palette-text-secondary) text-sm">
                                No question rating responses recorded yet.
                            </p>
                        )}
                        {summary?.questions.map((q) => (
                            <div
                                className="border border-(--mui-palette-divider) flex flex-wrap gap-3 items-center justify-between p-3 rounded-lg"
                                key={q.question_id}
                            >
                                <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                                    <span className="font-medium text-(--mui-palette-text-primary) text-sm">
                                        {q.question_text}
                                    </span>
                                    <span className="text-(--mui-palette-text-secondary) text-xs">
                                        {q.question_type} · {q.responses_count} response(s)
                                    </span>
                                </div>
                                <CommonBadgeStatus
                                    label={formatRating(q.avg_rating)}
                                    variant={resolveRatingVariant(q.avg_rating)}
                                />
                            </div>
                        ))}
                    </div>
                )}

                {activeTab === 'comments' && (
                    <div className="flex flex-col gap-3">
                        {(!summary?.comments || summary.comments.length === 0) && (
                            <p className="m-0 py-4 text-(--mui-palette-text-secondary) text-sm">
                                No written student feedback comments recorded yet.
                            </p>
                        )}
                        {summary?.comments.map((comment) => (
                            <div
                                className="bg-(--mui-palette-background-default) border border-(--mui-palette-divider) flex flex-col gap-2 p-4 rounded-lg"
                                key={comment.response_id}
                            >
                                <div className="flex items-center justify-between">
                                    <span className="font-semibold text-(--mui-palette-primary-main) text-xs">
                                        {comment.course_code} · {comment.section_code}
                                    </span>
                                    <span className="text-(--mui-palette-text-secondary) text-xs">
                                        {formatShortDate(comment.created_at)}
                                    </span>
                                </div>
                                <p className="italic m-0 text-(--mui-palette-text-primary) text-sm">
                                    &ldquo;{comment.response_text}&rdquo;
                                </p>
                            </div>
                        ))}
                    </div>
                )}
            </CommonCard>
        </CommonCard>
    );
}