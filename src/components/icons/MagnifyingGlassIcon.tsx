import { IconSvgProps } from '@type/common.type';

/**
 * MagnifyingGlassIcon
 * Renders a magnifying glass (search) SVG icon.
 *
 * Props:
 * - height: height of the SVG icon (default: 20).
 * - width: width of the SVG icon (default: 20).
 * - ...props: any additional SVG props (className, style, etc.).
 *
 * @example
 * <MagnifyingGlassIcon className="h-[20px] w-[20px]" />
 */
export default function MagnifyingGlassIcon({
    height = 20,
    width = 20,
    ...props
}: IconSvgProps) {
    return (
        <svg fill="currentColor" height={height} viewBox="0 0 256 256" width={width} xmlns="http://www.w3.org/2000/svg" {...props}>
            <path d="M232.49,215.51,185,168a92.12,92.12,0,1,0-17,17l47.53,47.54a12,12,0,0,0,17-17ZM44,112a68,68,0,1,1,68,68A68.07,68.07,0,0,1,44,112Z"></path>
        </svg>
    );
}