import { IconSvgProps } from '@type/common.type';

/**
 * ArrowIconDown
 * Renders a downward-pointing arrow symbol as an SVG.
 *
 * Props:
 * - height: height of the SVG icon.
 * - strokeWidth: thickness of the vertical and horizontal lines.
 * - width: width of the SVG icon.
 *
 * @example
 * <ArrowIconDown className="h-[24px] w-[24px]" />
 */
export default function ArrowIconDown({
    color = '#022179',
    height = 9,
    width = 12,
    ...props
}: IconSvgProps & { color?: string }) {
    return (
        <svg fill="none" height={height} viewBox="0 0 15 9" width={width} xmlns="http://www.w3.org/2000/svg" {...props}>
            <path d="M14.1032 1.60397L7.85319 7.85397C7.76609 7.94137 7.6626 8.01072 7.54864 8.05803C7.43469 8.10535 7.31251 8.12971 7.18913 8.12971C7.06574 8.12971 6.94356 8.10535 6.82961 8.05803C6.71565 8.01072 6.61216 7.94137 6.52506 7.85397L0.275064 1.60397C0.0989435 1.42785 -2.6244e-09 1.18898 0 0.939907C2.6244e-09 0.690836 0.0989435 0.451965 0.275064 0.275845C0.451184 0.0997246 0.690055 0.000781419 0.939126 0.000781417C1.1882 0.000781414 1.42707 0.0997246 1.60319 0.275845L7.18991 5.86256L12.7766 0.275064C12.9527 0.0989438 13.1916 0 13.4407 0C13.6898 0 13.9286 0.0989438 14.1048 0.275064C14.2809 0.451184 14.3798 0.690055 14.3798 0.939127C14.3798 1.1882 14.2809 1.42707 14.1048 1.60319L14.1032 1.60397Z" fill={color}/>
        </svg>
    );
}