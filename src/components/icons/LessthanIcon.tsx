import { IconSvgProps } from '@type/common.type';

/**
 * LessthanIcon
 * Renders a less-than (left arrow) SVG icon.
 *
 * Props:
 * - height: height of the SVG icon (default: 12).
 * - width: width of the SVG icon (default: 12).
 * - ...props: any additional SVG props (className, style, etc.).
 *
 * @example
 * <LessthanIcon className="h-[12px] w-[12px]" />
 */
export default function LessthanIcon({
    height = 20,
    width = 20,
    ...props
}: IconSvgProps) {
    return (
        <svg fill="currentColor" height={height} viewBox="0 0 256 256" width={width} xmlns="http://www.w3.org/2000/svg" {...props}>
            <path d="M168.49,199.51a12,12,0,0,1-17,17l-80-80a12,12,0,0,1,0-17l80-80a12,12,0,0,1,17,17L97,128Z"></path>
        </svg>
    );
}