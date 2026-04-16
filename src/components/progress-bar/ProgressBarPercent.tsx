import ProgressTrack from '@components/progress-bar/ProgressTrack';
import { ProgressBarBaseProps } from '@type/progress-bar.type';
import { classMerge } from '@utils/css.util';

interface ProgressBarPercentProps extends ProgressBarBaseProps {
    // Formatted display string (e.g. "67%")
    percentageText: string;
}

/**
 * ProgressBarPercent
 *
 * Percent-only layout for the progress bar — shows the track bar
 * with percentage text inline to the right.
 *
 * @example
 * <ProgressBarPercent
 *     fillColor="bg-blue-500"
 *     height={8}
 *     percentage={50}
 *     percentageText="50%"
 * />
 */
export default function ProgressBarPercent({
    className,
    fillColor,
    height,
    percentage,
    percentageText,
    ...props
}: ProgressBarPercentProps) {
    return (
        <div
            className={
                classMerge(
                    'flex gap-1.5 items-center justify-center w-full',
                    className
                )
            }
            {...props}
        >
            <ProgressTrack
                className="flex-1 min-w-0"
                fillColor={fillColor}
                height={height}
                percentage={percentage}
            />
            <span className="shrink-0 text-(--mui-tokens-color-neutral-500) tw_body_extra-small_bold whitespace-nowrap">
                {percentageText}
            </span>
        </div>
    );
}