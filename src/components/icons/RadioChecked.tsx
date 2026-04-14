import { IconSvgProps } from '@type/common.type';

/**
 * RadioButtonCheckedIcon renders the complete visual state of a selected radio button.
 * It displays a filled circle with an inner indicator to represent the active "on" state.
 *
 * Props:
 * - height: The vertical size of the SVG (defaults to 24).
 * - width: The horizontal size of the SVG (defaults to 24).
 * - ...props: Supports standard SVG attributes like className or fill.
 *
 * @example
 * <RadioButtonCheckedIcon className="h-[24px] w-[24px]" />
 */
export default function RadioCheckedIcon({
    height = 24,
    strokeWidth = 2,
    width = 24,
    ...props
}: IconSvgProps) {
    return (
        <svg fill="none" height={height} overflow="visible" viewBox="0 0 24 24" width={width} xmlns="http://www.w3.org/2000/svg" {...props}>
            <rect fill="currentColor" height="22" rx="11" stroke="currentColor" strokeWidth={strokeWidth} width="22" x="1" y="1" />
            <rect fill="white" height="8" rx="4" stroke="white" strokeWidth="2" width="8" x="8" y="8" />
        </svg>
    );
}