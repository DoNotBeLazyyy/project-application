import { IconSvgProps } from '@type/common.type';

/**
 * CheckboxCheckedIcon renders the complete visual state of a selected checkbox.
 * It includes both the square container and the inner checkmark as a single SVG.
 *
 * Props:
 * - height: The vertical size of the SVG (defaults to 24).
 * - width: The horizontal size of the SVG (defaults to 24).
 * - ...props: Supports standard SVG attributes like className or fill.
 *
 * @example
 * <CheckboxCheckedIcon className="h-[24px] w-[24px]" />
 */
export default function CheckboxCheckedIcon({
    height = 24,
    width = 24,
    ...props
}: IconSvgProps) {
    return (
        <svg height={height} overflow="visible" viewBox="0 0 24 24" width={width} xmlns="http://www.w3.org/2000/svg" {...props}>
            <path d="M0 4C0 1.79086 1.79086 0 4 0H20C22.2091 0 24 1.79086 24 4V20C24 22.2091 22.2091 24 20 24H4C1.79086 24 0 22.2091 0 20V4Z" fill="currentColor"/>
            <path d="M9.68502 17.2C9.44502 17.2 9.225 17.12 9.045 16.94L5.06502 12.96C4.70502 12.6 4.70502 12.04 5.06502 11.68C5.42502 11.32 5.985 11.32 6.345 11.68L9.70501 15.02L17.685 7.06004C18.045 6.70004 18.605 6.70004 18.965 7.06004C19.325 7.42004 19.325 7.98004 18.965 8.34004L10.345 16.94C10.145 17.12 9.92502 17.2 9.68502 17.2Z" fill="white"/>
        </svg>
    );
}