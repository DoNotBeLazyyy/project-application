import { IconSvgProps } from '@type/common.type';

/**
 * CheckboxIndeterminateIcon renders the mixed or partially selected state of a checkbox.
 * It typically displays a square container with a horizontal dash inside.
 *
 * Props:
 * - height: The vertical size of the SVG (defaults to 24).
 * - width: The horizontal size of the SVG (defaults to 24).
 * - ...props: Supports standard SVG attributes like className.
 *
 * @example
 * <CheckboxIndeterminateIcon className="h-[24px] w-[24px]" />
 */
export default function CheckboxIndeterminateIcon({
    height = 24,
    width = 24,
    ...props
}: IconSvgProps) {
    return (
        <svg fill="none" height={height} overflow="visible" viewBox="0 0 24 24" width={width} xmlns="http://www.w3.org/2000/svg" {...props} >
            <path d="M0 4C0 1.79086 1.79086 0 4 0H20C22.2091 0 24 1.79086 24 4V20C24 22.2091 22.2091 24 20 24H4C1.79086 24 0 22.2091 0 20V4Z" fill="currentColor" />
            <path d="M4 12C4 11.4477 4.44772 11 5 11H19C19.5523 11 20 11.4477 20 12C20 12.5523 19.5523 13 19 13H5C4.44772 13 4 12.5523 4 12Z" fill="white" />
        </svg>

    );
}