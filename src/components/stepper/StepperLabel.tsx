import { CommonBadgeStatus } from '@components/badge/CommonBadgeStatus';
import { CommonBadgeStatusProps } from '@type/common/badge.type';

interface StepperLabelProps {
    // Whether the label renders in vertical orientation
    isVertical: boolean;

    // The step label text (e.g. "STEP 1")
    label: string;

    // Optional status badge displayed below the title
    statusBadge?: CommonBadgeStatusProps;

    // The step title text
    title: string;
}

/**
 * StepperLabel
 *
 * Renders the text content for a single step — step label, title,
 * and optional status badge. Adjusts spacing based on orientation.
 *
 * @example
 * <StepperLabel
 *     isVertical={false}
 *     label="STEP 1"
 *     title="Setup"
 *     statusBadge={{ label: 'Pending', variant: 'info' }}
 * />
 */
export default function StepperLabel({
    isVertical,
    label,
    statusBadge,
    title
}: StepperLabelProps) {
    return (
        <div
            className={
                isVertical
                    ? 'flex flex-col gap-(--mui-tokens-spacing-2) items-start min-w-0 pt-(--mui-tokens-spacing-1)'
                    : 'flex flex-col items-start shrink-0'
            }
        >
            <div
                className={
                    isVertical
                        ? 'flex flex-col items-start'
                        : 'flex flex-col gap-(--mui-tokens-spacing-3) items-start justify-center'}
            >
                <div className="flex flex-col items-start">
                    <span className="text-(--mui-tokens-color-neutral-400) tw_body_extra-small uppercase">
                        {label}
                    </span>
                    <span className="text-(--mui-tokens-color-neutral-900) tw_h6">
                        {title}
                    </span>
                </div>
                {statusBadge && <CommonBadgeStatus {...statusBadge} />}
            </div>
        </div>
    );
}