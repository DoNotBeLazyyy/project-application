import { ProgressBarBaseProps } from '@type/progress-bar.type';
import { classMerge } from '@utils/css.util';

interface ProgressTrackProps extends ProgressBarBaseProps {
    // Whether the track renders vertically
    isVertical?: boolean;
}

/**
 * ProgressTrack
 *
 * The raw bar element — a neutral track with an animated fill overlay.
 * Supports both horizontal (fills width) and vertical (fills height) orientations.
 * Uses inline styles so CSS `transition` animates smoothly.
 *
 * @example
 * <ProgressTrack fillColor="bg-blue-500" height={8} percentage={50} />
 * <ProgressTrack fillColor="bg-green-500" height={4} isVertical percentage={75} />
 */
export default function ProgressTrack({
    className,
    fillColor,
    height,
    isVertical = false,
    percentage,
    ...props
}: ProgressTrackProps) {
    const trackDimension = isVertical
        ? { width: `${height}px` }
        : { height: `${height}px` }; // Track thickness style
    const trackClass = isVertical
        ? 'bg-(--mui-tokens-color-neutral-200) h-full overflow-hidden relative rounded-full'
        : 'bg-(--mui-tokens-color-neutral-200) overflow-hidden relative rounded-full shrink-0 w-full'; // Track orientation class
    const fillDimension = isVertical
        ? { height: `${percentage}%` }
        : { width: `${percentage}%` }; // Fill progress style
    const fillClass = isVertical
        ? 'absolute duration-200 left-0 rounded-full top-0 transition-all w-full'
        : 'absolute duration-200 h-full left-0 rounded-full top-0 transition-all'; // Fill orientation class

    return (
        <div
            className={
                classMerge(
                    trackClass,
                    className
                )
            }
            style={trackDimension}
            {...props}
        >
            <div
                className={
                    classMerge(
                        fillClass,
                        fillColor
                    )
                }
                style={fillDimension}
            />
        </div>
    );
}