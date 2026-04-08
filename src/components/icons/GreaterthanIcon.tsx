import { IconSvgProps } from '@type/common.type';

/**
 * GreaterthanIcon
 * Renders a greater-than (right arrow) SVG icon.
 *
 * Props:
 * - height: height of the SVG icon (default: 12).
 * - width: width of the SVG icon (default: 12).
 * - ...props: any additional SVG props (className, style, etc.).
 *
 * @example
 * <GreaterthanIcon className="h-[12px] w-[12px]" />
 */
export default function GreaterthanIcon({
    height = 20,
    width = 20,
    ...props
}: IconSvgProps) {
    return (
        <svg fill="currentColor" height={height} viewBox="0 0 256 256" width={width} xmlns="http://www.w3.org/2000/svg" {...props}>
            <path d="M184.49,136.49l-80,80a12,12,0,0,1-17-17L159,128,87.51,56.49a12,12,0,1,1,17-17l80,80A12,12,0,0,1,184.49,136.49Z"></path>
        </svg>
    );
}