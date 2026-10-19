import { CommonBadgeStatus } from '@components/badge/CommonBadgeStatus';
import CommonProgressBar from '@components/progress-bar/CommonProgressBar';
import { formatDate, formatPercent, formatScore, submissionStatusVariant } from '@pages/faculty/sections/student-detail/studentDetailFormat';
import { CaretRightIcon } from '@phosphor-icons/react';
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
        <div className="border-t border-(--mui-palette-divider) gap-2 grid grid-cols-12 items-center px-3 py-2">
            <div className="col-span-12 flex flex-col gap-0.5 sm:col-span-5">
                <span className="font-medium text-(--mui-palette-text-primary) text-sm">
                    {item.title}
                </span>
                <span className="text-(--mui-palette-text-secondary) text-xs">
                    {item.assessment_type}
                    {' · Due '}
                    {formatDate(item.due_at)}
                </span>
            </div>
            <div className="col-span-5 sm:col-span-3">
                <CommonBadgeStatus
                    label={item.submission_status ?? 'Not Started'}
                    variant={submissionStatusVariant(item.submission_status)}
                />
                {item.is_late && (
                    <span className="block mt-0.5 text-(--mui-palette-warning-main) text-xs">
                        Late
                    </span>
                )}
                {isPendingReview && (
                    <span className="block mt-0.5 text-(--mui-palette-text-secondary) text-xs">
                        Pending review
                    </span>
                )}
                {isUnsubmitted && !item.is_counted && (
                    <span className="block mt-0.5 text-(--mui-palette-text-secondary) text-xs">
                        No submission (0 pts)
                    </span>
                )}
            </div>
            <div className="col-span-4 sm:col-span-2 text-(--mui-palette-text-primary) text-right text-sm">
                {earnedDisplay}
                {' / '}
                {item.max_points}
            </div>
            <div className="col-span-3 sm:col-span-2 text-(--mui-palette-text-secondary) text-right text-sm">
                {percentDisplay}
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
        ? 'text-(--mui-palette-text-secondary)'
        : 'text-(--mui-palette-text-disabled)';

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
        <div className="border border-(--mui-palette-divider) overflow-hidden rounded-lg">
            <button
                aria-expanded={isExpanded}
                className="flex gap-3 hover:bg-(--mui-palette-action-hover) items-center px-3 py-3 text-left transition-colors w-full"
                disabled={!hasItems}
                type="button"
                onClick={function() {
                    setIsExpanded(function(current) {
                        return !current;
                    });
                }}
            >
                <CaretRightIcon
                    className={`shrink-0 transition-transform ${rotationClass} ${caretColorClass}`}
                    size={16}
                    weight="bold"
                />
                <div className="flex flex-col gap-1 min-w-0">
                    <span className="font-medium text-(--mui-palette-text-primary) text-sm truncate">
                        {component.name}
                    </span>
                    <span className="text-(--mui-palette-text-secondary) text-xs">
                        {`${component.weight}% of the period · ${itemSummary}${pendingSummary}`}
                    </span>
                </div>
                <div className="flex flex-1 gap-4 items-center justify-end">
                    <div className="hidden sm:block w-28">
                        <CommonProgressBar
                            percentage={percentage}
                            type="bar"
                        />
                    </div>
                    <div className="flex flex-col gap-0.5 text-right min-w-[7rem]">
                        <span className="font-semibold text-(--mui-palette-text-primary) text-sm">
                            {effectiveMaxPoints > 0 ? (
                                <>
                                    {formatScore(component.earned_points)}
                                    {' / '}
                                    {effectiveMaxPoints}
                                </>
                            ) : (
                                '—'
                            )}
                        </span>
                        <span className="text-(--mui-palette-text-secondary) text-xs">
                            {`${formatScore(component.weighted_score)} of ${component.weight} pts`}
                        </span>
                    </div>
                </div>
            </button>
            {isExpanded && hasItems && (
                <div className="bg-(--mui-palette-action-hover) flex flex-col">
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