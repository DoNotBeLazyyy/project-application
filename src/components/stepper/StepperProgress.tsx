import StepperConnector from '@components/stepper/StepperConnector';
import StepperIcon from '@components/stepper/StepperIcon';
import { StepStatus } from '@type/stepper.type';
import { ReactNode } from 'react';

interface StepperProgressProps {
    // Whether the step is currently active
    active: boolean;

    // Whether the step is completed
    completed: boolean;

    // Whether a connector line follows this step
    hasLine: boolean;

    // Custom icon override for the step circle
    icon?: ReactNode;

    // Whether the progress renders vertically
    isVertical: boolean;

    // Form completion progress for the active step (0–100)
    progress?: number;

    // The visual status of this step
    status: StepStatus;

    // The step number (1-based)
    stepNumber: number;
}

/**
 * StepperProgress
 *
 * Renders the icon + connector row for a single step. Handles both
 * horizontal (icon + line in a row) and vertical (icon + line in a column)
 * orientations.
 *
 * @example
 * <StepperProgress
 *     active={false}
 *     completed
 *     hasLine
 *     isVertical={false}
 *     stepNumber={1}
 *     status="complete"
 * />
 */
export default function StepperProgress({
    active,
    completed,
    hasLine,
    icon,
    isVertical,
    progress,
    status,
    stepNumber
}: StepperProgressProps) {
    const containerClass = isVertical
        ? 'flex flex-col items-center self-stretch shrink-0'
        : 'flex gap-(--mui-tokens-spacing-2) items-center shrink-0 w-full'; // Layout class by orientation

    return (
        <div className={containerClass}>
            <StepperIcon
                icon={icon}
                status={status}
                stepNumber={stepNumber}
            />
            {hasLine && (
                <StepperConnector
                    active={active}
                    completed={completed}
                    isVertical={isVertical}
                    progress={progress}
                />
            )}
        </div>
    );
}