import CommonStatusBadge from '@components/status-badge/CommonStatusBadge';
import { StatusBadgeProps } from '@type/status-badge.type';

interface StepperLabelProps {
    // Whether the label renders in vertical orientation
    isVertical: boolean;

    // The step label text (e.g. "STEP 1")
    label: string;

    // Optional status badge displayed below the title
    statusBadge?: StatusBadgeProps;

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
    const containerClass = isVertical
        ? 'flex flex-col gap-(--mui-tokens-spacing-2) items-start min-w-0 pt-(--mui-tokens-spacing-1)'
        : 'flex flex-col items-start shrink-0'; // Outer wrapper class
    const innerClass = isVertical
        ? 'flex flex-col items-start'
        : 'flex flex-col gap-(--mui-tokens-spacing-3) items-start justify-center'; // Inner content class

    return (
        <div className={containerClass}>
            <div className={innerClass}>
                <div className="flex flex-col items-start">
                    <span className="text-(--mui-tokens-color-neutral-400) tw_body_extra-small uppercase">
                        {label}
                    </span>
                    <span className="text-(--mui-tokens-color-neutral-900) tw_h6">
                        {title}
                    </span>
                </div>
                {statusBadge && (
                    <CommonStatusBadge
                        label={statusBadge.label}
                        variant={statusBadge.variant}
                    />
                )}
            </div>
        </div>
    );
}