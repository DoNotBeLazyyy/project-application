import CommonProgressBar from '@components/progress-bar/CommonProgressBar';

interface StepperConnectorProps {
    // Whether the preceding step is active
    active?: boolean;

    // Whether the preceding step is completed
    completed?: boolean;

    // Whether the connector renders vertically
    isVertical?: boolean;

    // Custom fill percentage (0–100). Overrides the default active=50 / completed=100 behavior.
    progress?: number;
}

/**
 * StepperConnector
 *
 * Connector between stepper steps. Uses CommonProgressBar for both horizontal
 * and vertical orientations, with fill color and percentage by step state:
 * - Completed: 100% green
 * - Active: 50% blue (or custom `progress` value)
 * - Default: 0% (empty track)
 *
 * @example
 * <StepperConnector active completed={false} />
 * <StepperConnector active isVertical progress={75} />
 */
export default function StepperConnector({
    active = false,
    completed = false,
    isVertical = false,
    progress
}: StepperConnectorProps) {
    const defaultPercentage = completed
        ? 100
        : active
            ? 50
            : 0; // Default fill percentage by state
    const percentage = active && progress !== undefined
        ? progress
        : defaultPercentage; // Use custom progress when active, otherwise default
    const fillClassName = completed
        ? 'bg-(--mui-tokens-color-state-success)'
        : active
            ? 'bg-(--mui-tokens-color-brand-500)'
            : undefined; // Resolved fill color class
    const connectorClass = isVertical
        ? 'flex-1 min-h-[48px] my-(--mui-tokens-spacing-3)'
        : 'flex-1 ml-(--mui-tokens-spacing-3) mr-(--mui-tokens-spacing-3)'; // Layout class by orientation

    return <CommonProgressBar
        className={connectorClass}
        fillClassName={fillClassName}
        height={4}
        isVertical={isVertical}
        percentage={percentage}
        type="bar"
    />;
}