import ProgressTrack from '@components/progress-bar/ProgressTrack';
import { ProgressBarBaseProps } from '@type/progress-bar.type';
import { classMerge } from '@utils/css.util';

interface ProgressBarLabelProps extends ProgressBarBaseProps {
    // Whether to show the sub text below the bar
    hasSubtext: boolean;

    // The label text displayed above the bar
    label: string;

    // Formatted display string (e.g. "67%")
    percentageText: string;

    // The sub text displayed below the bar
    subText: string;
}

/**
 * ProgressBarLabel
 *
 * Label layout for the progress bar — shows label + percentage text above,
 * the track bar in the middle, and optional sub text below.
 *
 * @example
 * <ProgressBarLabel
 *     fillColor="bg-blue-500"
 *     hasSubtext
 *     height={8}
 *     label="Upload Progress"
 *     percentage={67}
 *     percentageText="67%"
 *     subText="3 of 5 files"
 * />
 */
export default function ProgressBarLabel({
    className,
    fillColor,
    hasSubtext,
    height,
    label,
    percentage,
    percentageText,
    subText,
    ...props
}: ProgressBarLabelProps) {
    return (
        <div
            className={
                classMerge(
                    'flex flex-col gap-1.5 items-center justify-center w-full',
                    className
                )
            }
            {...props}
        >
            <div className="flex items-center justify-between shrink-0 w-full whitespace-nowrap">
                <span className="text-(--mui-tokens-color-neutral-900) tw_body_small">
                    {label}
                </span>
                <span className="text-(--mui-tokens-color-neutral-500) tw_body_extra-small_bold">
                    {percentageText}
                </span>
            </div>
            <ProgressTrack
                fillColor={fillColor}
                height={height}
                percentage={percentage}
            />
            {hasSubtext && (
                <span className="h-4.5 shrink-0 text-(--mui-tokens-color-neutral-500) tw_body_extra-small_bold w-full">
                    {subText}
                </span>
            )}
        </div>
    );
}