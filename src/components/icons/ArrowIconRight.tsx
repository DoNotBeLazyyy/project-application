import { IconSvg } from '@type/common.type';

/**
 * ArrowIconRight
 * Renders a right-pointing arrow symbol as an SVG.
 *
 * Props:
 * - height: height of the SVG icon.
 * - strokeWidth: thickness of the vertical and horizontal lines.
 * - width: width of the SVG icon.
 *
 * @example
 * <ArrowIconRight className="h-[24px] w-[24px]" />
 */
export default function ArrowIconRight({
    color = '#022179',
    height = 12,
    width = 9,
    ...props
}: IconSvg) {
    return (
        <svg fill="none" height={height} viewBox="0 0 9 15" width={width} xmlns="http://www.w3.org/2000/svg" {...props}>
            <path d="M1.60397 0.276629L7.85397 6.52663C7.94137 6.61373 8.01072 6.71722 8.05803 6.83117C8.10535 6.94513 8.12971 7.0673 8.12971 7.19069C8.12971 7.31408 8.10535 7.43625 8.05803 7.55021C8.01072 7.66416 7.94137 7.76766 7.85397 7.85475L1.60397 14.1048C1.42785 14.2809 1.18898 14.3798 0.939907 14.3798C0.690836 14.3798 0.451965 14.2809 0.275845 14.1048C0.0997246 13.9286 0.000781419 13.6898 0.000781417 13.4407C0.000781414 13.1916 0.0997246 12.9527 0.275845 12.7766L5.86256 7.18991L0.275064 1.60319C0.0989438 1.42707 0 1.1882 0 0.93913C0 0.690059 0.0989438 0.451188 0.275064 0.275068C0.451184 0.0989475 0.690055 1.90735e-06 0.939127 1.90735e-06C1.1882 1.90735e-06 1.42707 0.0989475 1.60319 0.275068L1.60397 0.276629Z" fill={color} />
        </svg>
    );
}