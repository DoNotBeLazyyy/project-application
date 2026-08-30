import { GradingPeriodDraft } from '@type/grading-config.type';
import { classMerge } from '@utils/css.util';
import { periodRailColor, termTotal, toWeight, TERM_WEIGHT_TOTAL } from '@utils/period-allocation.util';

export interface PeriodAllocationBarProps {
    className?: string;
    periods: GradingPeriodDraft[];
}

/**
 * Translucent so the periods spilling past the 100 line still read through it.
 * An opaque hatch hides whichever segment it covers, which made the bar
 * disagree with the period list about how many periods exist.
 */
const OVER_BUDGET_HATCH = 'repeating-linear-gradient(135deg, color-mix(in srgb, var(--mui-tokens-color-red-600) 70%, transparent) 0 7px, color-mix(in srgb, var(--mui-tokens-color-red-400) 48%, transparent) 7px 14px)';

const NAME_LABEL_MIN_WIDTH = 12;
const VALUE_LABEL_MIN_WIDTH = 5;

const RADIUS = 'var(--mui-tokens-radius-md)';
const SEGMENT_DIVIDER = 'inset 2px 0 0 var(--mui-tokens-color-common-white)';

/**
 * PeriodAllocationBar
 *
 * The term's whole 100% as one bar, segmented by period in sequence order.
 *
 * When the periods overspend, the bar scales to the larger total and a solid
 * budget line marks where 100 falls, so the excess is drawn as hatched red
 * spilling past it. The user is never told about the overage in prose — they
 * watch it happen as they edit.
 */
export default function PeriodAllocationBar({ className, periods }: PeriodAllocationBarProps) {
    const total = termTotal(periods);
    const scale = Math.max(TERM_WEIGHT_TOTAL, total);
    const budgetLinePercent = (TERM_WEIGHT_TOTAL / scale) * 100;

    let cursor = 0;

    return (
        <div className={classMerge('flex flex-col gap-2 min-w-0', className)}>
            <div className="bg-(--mui-tokens-color-neutral-200) h-12 relative rounded-(--mui-tokens-radius-md)">
                {periods.map(function(period, index) {
                    const weight = toWeight(period.weight);
                    const leftPercent = (cursor / scale) * 100;
                    const widthPercent = (weight / scale) * 100;
                    const isFirst = index === 0;

                    cursor += weight;

                    // Only the segment that actually reaches the right end of the
                    // bar gets a rounded edge — when the term overspends, that
                    // edge belongs to the hatched overage instead.
                    const isClosingEdge = index === periods.length - 1 && total <= TERM_WEIGHT_TOTAL;

                    return (
                        <div
                            className="absolute flex font-semibold h-full items-center justify-center overflow-hidden text-(--mui-tokens-color-common-white) text-xs transition-all duration-300"
                            key={period.key}
                            style={{
                                background: periodRailColor(index),
                                borderBottomLeftRadius: isFirst
                                    ? RADIUS
                                    : undefined,
                                borderBottomRightRadius: isClosingEdge
                                    ? RADIUS
                                    : undefined,
                                borderTopLeftRadius: isFirst
                                    ? RADIUS
                                    : undefined,
                                borderTopRightRadius: isClosingEdge
                                    ? RADIUS
                                    : undefined,
                                boxShadow: isFirst
                                    ? undefined
                                    : SEGMENT_DIVIDER,
                                left: `${leftPercent}%`,
                                width: `${widthPercent}%`
                            }}
                            title={`${period.name || 'Untitled period'}: ${weight}%`}
                        >
                            {widthPercent > NAME_LABEL_MIN_WIDTH && (
                                <span className="px-1.5 truncate">
                                    {period.name || 'Untitled'} · {weight}%
                                </span>
                            )}
                            {widthPercent <= NAME_LABEL_MIN_WIDTH && widthPercent > VALUE_LABEL_MIN_WIDTH && (
                                <span className="px-1">{weight}</span>
                            )}
                        </div>
                    );
                })}

                {total > TERM_WEIGHT_TOTAL && (
                    <div
                        className="absolute h-full rounded-r-(--mui-tokens-radius-md) transition-all duration-300"
                        style={{
                            background: OVER_BUDGET_HATCH,
                            left: `${budgetLinePercent}%`,
                            width: `${100 - budgetLinePercent}%`
                        }}
                        title={`${total - TERM_WEIGHT_TOTAL} points over budget`}
                    />
                )}

                <div
                    className="-bottom-1.5 -top-1.5 absolute bg-(--mui-tokens-color-neutral-900) transition-all duration-300 w-0.5 z-10"
                    style={{ left: `${budgetLinePercent}%` }}
                >
                    <span className="-top-4 -translate-x-1/2 absolute bg-(--mui-tokens-color-neutral-900) font-bold left-1/2 px-1 rounded-(--mui-tokens-radius-sm) text-(--mui-tokens-color-common-white) text-[9px]">
                        100
                    </span>
                </div>
            </div>
        </div>
    );
}