import { IconSvgProps } from '@type/common.type';

/**
 * CheckboxButtonUncheckedIcon renders the empty/unselected state of a checkbox.
 * It displays a square outline as a placeholder for a selection.
 *
 * Props:
 * - height: The vertical size of the SVG (defaults to 24).
 * - width: The horizontal size of the SVG (defaults to 24).
 * - ...props: Supports standard SVG attributes like className.
 *
 * @example
 * <CheckboxButtonUncheckedIcon className="h-[24px] w-[24px]" />
 */
export default function CheckboxUncheckedIcon({
    height = 24,
    width = 24,
    ...props
}: IconSvgProps) {
    return (
        <svg fill="none" height={height} overflow="visible" viewBox="0 0 24 24" width={width} xmlns="http://www.w3.org/2000/svg" {...props}>
            <path d="M4 1H20C21.6569 1 23 2.34315 23 4V20C23 21.6569 21.6569 23 20 23H4C2.34315 23 1 21.6569 1 20V4C1 2.34315 2.34315 1 4 1Z" stroke="currentColor" strokeWidth="2"/>
        </svg>
    );
}