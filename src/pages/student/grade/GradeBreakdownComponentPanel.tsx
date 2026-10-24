import { CommonBadgeStatus } from '@components/badge/CommonBadgeStatus';
import CommonProgressBar from '@components/progress-bar/CommonProgressBar';
import { formatDate, formatPercent, formatScore, submissionStatusVariant } from '@pages/faculty/sections/student-detail/studentDetailFormat';
import { CaretRightIcon, FileTextIcon } from '@phosphor-icons/react';
import { MyGradeBreakdownComponent, MyGradeBreakdownItem } from '@type/student-portal.type';
import { useState } from 'react';

interface GradeBreakdownComponentPanelProps {
    component: MyGradeBreakdownComponent;
    defaultExpanded: boolean;
}

interface ItemRowProps {
    item: MyGradeBreakdownItem;
}

function ItemRow({ item }: ItemRowProps) {
    const isUnsubmitted = !item.submission_status || item.submission_status === 'Not Started';
    const isPendingReview = item.submission_status === 'Submitted' && item.earned_points === null;
    const earnedDisplay = item.earned_points !== null
        ? formatScore(item.earned_points)
        : (isUnsubmitted ? '0' : '—');
    const percentDisplay = item.earned_points !== null
        ? formatPercent(item.earned_points, item.max_points)
        : (isUnsubmitted ? '0%' : '—');

    return (
        <div className="border-t border-slate-200/70 dark:border-zinc-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 bg-white/60 dark:bg-zinc-900/60 hover:bg-slate-50 dark:hover:bg-zinc-800/40 transition-colors">
            <div className="flex items-start gap-3 min-w-0 flex-1">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-slate-300 mt-0.5">
                    <FileTextIcon size={18} />
                </div>
                <div className="flex flex-col gap-0.5 min-w-0">
                    <span className="font-semibold text-slate-900 dark:text-slate-100 text-sm truncate">
                        {item.title}
                    </span>
                    <span className="text-slate-500 dark:text-slate-400 text-xs">
                        {item.assessment_type}
                        {' · Due '}
                        {formatDate(item.due_at)}
                    </span>
                </div>
            </div>

            <div className="flex flex-wrap items-center justify-between sm:justify-end gap-3 sm:gap-6 shrink-0">
                <div className="flex flex-col items-start sm:items-end">
                    <CommonBadgeStatus
                        label={item.submission_status ?? 'Not Started'}
                        variant={submissionStatusVariant(item.submission_status)}
                    />
                    {item.is_late && (
                        <span className="mt-0.5 font-medium text-amber-600 dark:text-amber-400 text-[11px]">
                            Late Submission
                        </span>
                    )}
                    {isPendingReview && (
                        <span className="mt-0.5 text-slate-500 dark:text-slate-400 text-[11px]">
                            Pending faculty review
                        </span>
                    )}
                    {isUnsubmitted && !item.is_counted && (
                        <span className="mt-0.5 text-slate-400 text-[11px]">
                            No submission (0 pts)
                        </span>
                    )}
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex flex-col items-end">
                        <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                            {earnedDisplay}
                            <span className="font-normal text-slate-400 text-xs"> / {item.max_points}</span>
                        </span>
                        <span className="text-slate-500 dark:text-slate-400 text-xs">
                            {percentDisplay}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function GradeBreakdownComponentPanel({ component, defaultExpanded }: GradeBreakdownComponentPanelProps) {
    const [isExpanded, setIsExpanded] = useState<boolean>(defaultExpanded);

    const hasItems = component.items.length > 0;
    const totalItemMax = component.items.reduce(function(acc, item) {
        return acc + (item.max_points || 0);
    }, 0);
    const effectiveMaxPoints = component.max_points > 0 ? component.max_points : totalItemMax;

    const percentage = effectiveMaxPoints > 0
        ? (component.earned_points / effectiveMaxPoints) * 100
        : (component.percentage ?? 0);

    const rotationClass = isExpanded
        ? 'rotate-90'
        : '';
    const caretColorClass = hasItems
        ? 'text-slate-600 dark:text-slate-300'
        : 'text-slate-400 dark:text-zinc-600';

    const effectiveGradedCount = component.items.filter(
        (item) => item.is_counted || item.earned_points !== null
    ).length;
    const gradedCountDisplay = component.graded_count > 0 ? component.graded_count : effectiveGradedCount;

    const itemSummary = hasItems
        ? `${gradedCountDisplay} of ${component.items.length} graded`
        : 'No assessments';

    const pendingReviewCount = component.items.filter(
        (item) => item.submission_status === 'Submitted' && item.earned_points === null
    ).length;
    const pendingSummary = pendingReviewCount > 0
        ? ` · ${pendingReviewCount} pending review`
        : '';

    return (
        <div className="border border-slate-200/90 dark:border-zinc-800 rounded-xl overflow-hidden shadow-2xs bg-white dark:bg-zinc-900 transition-all">
            <button
                aria-expanded={isExpanded}
                className="flex items-center gap-3.5 hover:bg-slate-50/80 dark:hover:bg-zinc-800/50 p-3.5 sm:p-4 text-left transition-colors w-full cursor-pointer disabled:cursor-default"
                disabled={!hasItems}
                type="button"
                onClick={function() {
                    setIsExpanded(function(current) {
                        return !current;
                    });
                }}
            >
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 dark:bg-zinc-800 shrink-0">
                    <CaretRightIcon
                        className={`transition-transform duration-200 ${rotationClass} ${caretColorClass}`}
                        size={14}
                        weight="bold"
                    />
                </div>

                <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 dark:text-slate-100 text-sm sm:text-base truncate">
                            {component.name}
                        </span>
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/60 shrink-0">
                            {component.weight}% Weight
                        </span>
                    </div>
                    <span className="text-slate-500 dark:text-slate-400 text-xs">
                        {itemSummary}{pendingSummary}
                    </span>
                </div>

                <div className="flex items-center gap-3 sm:gap-6 shrink-0">
                    <div className="hidden sm:block w-28">
                        <CommonProgressBar
                            percentage={percentage}
                            type="bar"
                        />
                    </div>
                    <div className="flex flex-col text-right min-w-[5.5rem] sm:min-w-[7rem]">
                        <span className="font-bold text-slate-900 dark:text-slate-100 text-sm sm:text-base">
                            {effectiveMaxPoints > 0 ? (
                                <>
                                    {formatScore(component.earned_points)}
                                    <span className="font-normal text-slate-400 text-xs"> / {effectiveMaxPoints}</span>
                                </>
                            ) : (
                                '—'
                            )}
                        </span>
                        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                            {`${formatScore(component.weighted_score)} / ${component.weight} pts`}
                        </span>
                    </div>
                </div>
            </button>

            {isExpanded && hasItems && (
                <div className="border-t border-slate-200 dark:border-zinc-800 flex flex-col">
                    {component.items.map(function(item) {
                        return (
                            <ItemRow
                                item={item}
                                key={item.id}
                            />
                        );
                    })}
                </div>
            )}
        </div>
    );
}
