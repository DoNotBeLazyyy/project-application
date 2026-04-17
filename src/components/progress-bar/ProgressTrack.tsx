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
    isVertical,
    percentage,
    ...props
}: ProgressTrackProps) {
    return (
        <div
            className={
                classMerge(
                    isVertical
                        ? 'bg-(--mui-tokens-color-neutral-200) h-full overflow-hidden relative rounded-full'
                        : 'bg-(--mui-tokens-color-neutral-200) overflow-hidden relative rounded-full shrink-0 w-full',
                    className
                )
            }
            style={
                isVertical
                    ? { width: height }
                    : { height }
            }
            {...props}
        >
            <div
                className={
                    classMerge(
                        isVertical
                            ? 'absolute duration-200 left-0 rounded-full top-0 transition-all w-full'
                            : 'absolute duration-200 h-full left-0 rounded-full top-0 transition-all',
                        fillColor
                    )
                }
                style={
                    isVertical
                        ? { height: `${percentage}%` }
                        : { width: `${percentage}%` }
                }
            />
        </div>
    );
}