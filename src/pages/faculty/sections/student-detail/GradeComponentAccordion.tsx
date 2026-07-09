import { CommonBadgeStatus } from '@components/badge/CommonBadgeStatus';
import CommonProgressBar from '@components/progress-bar/CommonProgressBar';
import { formatDate, formatPercent, formatScore, submissionStatusVariant } from '@pages/faculty/sections/student-detail/studentDetailFormat';
import { CaretRightIcon } from '@phosphor-icons/react';
import { StudentGradeComponent, StudentGradeComponentItem } from '@type/faculty.type';
import { useState } from 'react';

interface GradeComponentAccordionProps {
    component: StudentGradeComponent;
    defaultExpanded: boolean;
}

interface ItemRowProps {
    item: StudentGradeComponentItem;
}

function ItemRow({ item }: ItemRowProps) {
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
            <div className="col-span-4 sm:col-span-3">
                <CommonBadgeStatus
                    label={item.submission_status ?? 'Not Started'}
                    variant={submissionStatusVariant(item.submission_status)}
                />
                {item.is_late && (
                    <span className="block mt-0.5 text-(--mui-palette-warning-main) text-xs">
                        Late
                    </span>
                )}
            </div>
            <div className="col-span-4 sm:col-span-2 text-(--mui-palette-text-primary) text-right text-sm">
                {formatScore(item.earned_points)}
                {' / '}
                {item.max_points}
            </div>
            <div className="col-span-4 sm:col-span-2 text-(--mui-palette-text-secondary) text-right text-sm">
                {formatPercent(item.earned_points, item.max_points)}
            </div>
        </div>
    );
}

export default function GradeComponentAccordion({ component, defaultExpanded }: GradeComponentAccordionProps) {
    const [isExpanded, setIsExpanded] = useState<boolean>(defaultExpanded);

    const hasItems = component.items.length > 0;
    const percentage = component.max_points > 0
        ? (component.earned_points / component.max_points) * 100
        : 0;
    const rotationClass = isExpanded
        ? 'rotate-90'
        : '';
    const caretColorClass = hasItems
        ? 'text-(--mui-palette-text-secondary)'
        : 'text-(--mui-palette-text-disabled)';
    const itemCountLabel = component.items.length === 1
        ? 'item'
        : 'items';
    const itemSummary = hasItems
        ? `${component.items.length} ${itemCountLabel}`
        : 'No assessments';

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
                        {`${component.weight}% weight · ${itemSummary}`}
                    </span>
                </div>
                <div className="flex flex-1 gap-4 items-center justify-end">
                    <div className="hidden sm:block w-28">
                        <CommonProgressBar
                            percentage={percentage}
                            type="bar"
                        />
                    </div>
                    <div className="flex flex-col gap-0.5 text-right w-24">
                        <span className="font-semibold text-(--mui-palette-text-primary) text-sm">
                            {formatScore(component.earned_points)}
                            {' / '}
                            {component.max_points}
                        </span>
                        <span className="text-(--mui-palette-text-secondary) text-xs">
                            {`${formatScore(component.weighted_score)} pts weighted`}
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