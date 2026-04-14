import { IconSvgProps } from '@type/common.type';

/**
 * RadioButtonUncheckedIcon renders an unselected radio button (circle outline) as an SVG.
 * Commonly used to represent an unchecked or unselected state in forms.
 *
 * Props:
 * - height: The vertical size of the SVG icon (defaults to 24).
 * - width: The horizontal size of the SVG icon (defaults to 24).
 * - ...props: Supports standard SVG attributes like className or stroke color.
 *
 * @example
 * <RadioButtonUncheckedIcon className="h-[24px] w-[24px]" />
 */
export default function RadioUncheckedIcon({
    height = 24,
    strokeWidth = 2,
    width = 24,
    ...props
}: IconSvgProps) {
    return (
        <svg fill="none" height={height} overflow="visible" viewBox="0 0 24 24" width={width} xmlns="http://www.w3.org/2000/svg" {...props}>
            <rect height="22" rx="11" stroke="currentColor" strokeWidth={strokeWidth} width="21" x="1.5" y="1.5" />
        </svg>
    );
};