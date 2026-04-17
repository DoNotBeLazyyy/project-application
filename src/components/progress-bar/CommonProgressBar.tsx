import ProgressBarLabel from '@components/progress-bar/ProgressBarLabel';
import ProgressBarPercent from '@components/progress-bar/ProgressBarPercent';
import ProgressTrack from '@components/progress-bar/ProgressTrack';
import { HTMLAttributesDivElement } from '@type/common.type';

type ProgressBarType = 'bar' | 'label' | 'percentOnly';

interface CommonProgressBarProps extends Omit<HTMLAttributesDivElement, 'children'> {
    // Custom CSS class for the fill bar (overrides default brand-500 color)
    fillClassName?: string;

    // Whether to show the sub text below the bar (only for 'label' type)
    hasSubtext?: boolean;

    // Track thickness in pixels (width for vertical, height for horizontal)
    height?: number;

    // Whether the track renders vertically (only applies to 'bar' type)
    isVertical?: boolean;

    // The label text displayed above the bar (only for 'label' type)
    label?: string;

    // The fill percentage (0–100)
    percentage: number;

    // The sub text displayed below the bar (only for 'label' type)
    subText?: string;

    // The display type of the progress bar
    type?: ProgressBarType;
}

/**
 * CommonProgressBar
 *
 * A reusable progress bar component from the design system. Supports
 * three display types:
 * - "label": shows label + percentage text above, bar, and optional sub text
 * - "percentOnly": shows bar with percentage text inline to the right
 * - "bar": renders only the bare track (used by stepper connector)
 *
 * The fill color can be customized via `fillClassName` for integration
 * with other components (e.g., stepper connector uses green/blue fills).
 *
 * @example
 * <CommonProgressBar
 *     label="Upload Progress"
 *     percentage={67}
 *     subText="3 of 5 files"
 * />
 *
 * <CommonProgressBar
 *     percentage={50}
 *     type="percentOnly"
 * />
 */
export default function CommonProgressBar({
    className,
    fillClassName,
    hasSubtext = true,
    height = 8,
    isVertical,
    label = '',
    percentage,
    subText = '',
    type = 'label',
    ...props
}: CommonProgressBarProps) {
    const clampedPercentage = Math.max(0, Math.min(100, percentage)); // Clamped 0–100
    const displayPercentage = `${Math.round(clampedPercentage)}%`; // Formatted display string
    const fillColor = fillClassName || 'bg-(--mui-tokens-color-brand-500)'; // Resolved fill color class
    const commonProps = {
        className,
        fillColor,
        height,
        percentage: clampedPercentage,
        ...props
    }; // Shared props across all variants
    const textProps = {
        percentageText: displayPercentage,
        ...commonProps
    }; // Shared props for label and percent variants

    return type === 'bar'
        ? <ProgressTrack
            isVertical={isVertical}
            {...commonProps}
        />
        : type === 'label'
            ? <ProgressBarLabel
                hasSubtext={hasSubtext}
                label={label}
                subText={subText}
                {...textProps}
            />
            : <ProgressBarPercent {...textProps} />;
}