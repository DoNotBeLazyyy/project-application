import StepperLabel from '@components/stepper/StepperLabel';
import StepperProgress from '@components/stepper/StepperProgress';
import { CommonBadgeStatusProps } from '@type/common/badge.type';
import { classMerge } from '@utils/css.util';
import { ReactNode } from 'react';

interface StepperItemProps {
    // The current active step index
    activeStep: number;

    // The current animated completion position
    animatedCompleted: number;

    // The effective completion boundary
    effectiveCompleted: number;

    // Custom icon override for the step circle
    icon?: ReactNode;

    // This step's index in the array
    index: number;

    // Whether the step renders vertically
    isVertical: boolean;

    // The step label text (e.g. "STEP 1")
    label: string;

    // Form completion progress (0–100)
    progress?: number;

    // Optional status badge
    statusBadge?: CommonBadgeStatusProps;

    // The step title text
    title: string;

    // Total number of steps
    totalSteps: number;

    // Callback fired when the step is clicked
    onStepClick?: (index: number) => void;
}

/**
 * StepperItem
 *
 * A single step in the stepper — computes its own status from the
 * stepper's animation state, then renders the progress indicator
 * (icon + connector) and label (text + badge).
 *
 * @example
 * <StepperItem
 *     activeStep={1}
 *     animatedCompleted={1}
 *     effectiveCompleted={1}
 *     index={0}
 *     isVertical={false}
 *     label="STEP 1"
 *     title="Setup"
 *     totalSteps={4}
 * />
 */
export default function StepperItem({
    activeStep,
    animatedCompleted,
    effectiveCompleted,
    icon,
    index,
    isVertical,
    label,
    progress,
    statusBadge,
    title,
    totalSteps,
    onStepClick
}: StepperItemProps) {
    const isAnimating = animatedCompleted !== effectiveCompleted; // Whether sequential animation is in progress
    const isCompleted = isAnimating && effectiveCompleted > animatedCompleted
        ? index <= animatedCompleted
        : index < animatedCompleted; // Connector completion state
    const isActive = index === activeStep; // Whether this is the current step
    const isClickable = !!onStepClick && index <= effectiveCompleted && index !== activeStep; // Only completed or next step is clickable
    const hasLine = index < totalSteps - 1; // Whether connector follows

    /**
     * Handles click for this step.
     */
    function handleClick() {
        if (isClickable) {
            onStepClick(index);
        }
    }

    return (
        <div
            className={
                classMerge(
                    isVertical
                        ? 'flex gap-(--mui-tokens-spacing-4) items-start'
                        : 'flex flex-col gap-(--mui-tokens-spacing-4) items-start p-(--mui-tokens-spacing-3)',
                    hasLine
                        ? isVertical
                            ? 'flex-1'
                            : 'flex-1 min-h-px'
                        : 'shrink-0',
                    isClickable && 'cursor-pointer'
                )
            }
            onClick={handleClick}
        >
            <StepperProgress
                active={!isAnimating && isActive}
                completed={isCompleted}
                hasLine={hasLine}
                icon={icon}
                isVertical={isVertical}
                progress={progress}
                status={
                    isActive
                        ? 'in-progress'
                        : isCompleted
                            ? 'complete'
                            : 'default'
                }
                stepNumber={index + 1}
            />
            <StepperLabel
                isVertical={isVertical}
                label={label}
                statusBadge={statusBadge}
                title={title}
            />
        </div>
    );
}