import StepperLabel from '@components/stepper/StepperLabel';
import StepperProgress from '@components/stepper/StepperProgress';
import { HTMLAttributesDivElement } from '@type/common.type';
import { StepConfig, StepperOrientation } from '@type/stepper.type';
import { classMerge } from '@utils/css.util';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

interface CommonStepperProps extends Omit<HTMLAttributesDivElement, 'onClick'> {
    // The current active step index (0-based)
    activeStep: number;

    // Interval in ms between sequential connector animations
    animationDuration?: number;

    // The highest step index that has been completed.
    completedUpTo?: number;

    // Whether the stepper is horizontal or vertical
    orientation?: StepperOrientation;

    // Step definitions
    steps: StepConfig[];

    // Callback fired when a step is clicked
    onStepClick?: (stepIndex: number) => void;
}

/**
 * CommonStepper
 *
 * A multi-step progress indicator that displays steps in horizontal or
 * vertical orientation with animated progress bars, custom icons
 * (numbers/checkmarks), and optional status badges.
 *
 * Supports navigating back to a previous step while keeping completed
 * steps green via the `completedUpTo` prop.
 *
 * @example
 * <CommonStepper
 *     activeStep={1}
 *     completedUpTo={3}
 *     steps={[
 *         { title: 'Personal Info' },
 *         { title: 'Employment' },
 *         { title: 'Documents' },
 *         { title: 'Confirmation' }
 *     ]}
 * />
 */
export default function CommonStepper({
    activeStep,
    animationDuration = 50,
    className,
    completedUpTo,
    orientation = 'horizontal',
    steps,
    onStepClick,
    ...props
}: CommonStepperProps) {
    const { t } = useTranslation(); // Translation hook
    const effectiveCompleted = completedUpTo ?? activeStep; // Resolved completion boundary
    const [animatedCompleted, setAnimatedCompleted] = useState(effectiveCompleted); // Animated completion position
    const isVertical = orientation === 'vertical'; // Layout direction flag
    const containerClass = isVertical
        ? 'flex flex-col'
        : 'flex flex-row items-start w-full'; // Resolved container layout class

    useEffect(() => {
        if (animatedCompleted === effectiveCompleted) {
            return;
        }

        const timer = setTimeout(animateTick, animationDuration);

        return () => clearTimeout(timer);
    }, [animationDuration, effectiveCompleted, animatedCompleted]);

    /**
     * Advances animatedCompleted one step toward effectiveCompleted.
     *
     * @param prev - The current animated position.
     * @returns The next animated position.
     */
    function stepToward(prev: number): number {
        return prev < effectiveCompleted
            ? prev + 1
            : prev - 1;
    }

    /**
     * Triggers the next animation tick.
     */
    function animateTick() {
        setAnimatedCompleted(stepToward);
    }

    return (
        <div
            className={
                classMerge(
                    containerClass,
                    className
                )
            }
            {...props}
        >
            {steps.map(({
                icon,
                label,
                progress,
                statusBadge,
                title
            }, index) => {
                const isAnimating = animatedCompleted !== effectiveCompleted; // Whether sequential animation is in progress
                const isForward = effectiveCompleted > animatedCompleted; // Whether animating forward
                const isCompleted = isAnimating && isForward
                    ? index <= animatedCompleted
                    : index < animatedCompleted; // Connector completion state
                const isActive = index === activeStep; // Whether this is the current step
                const status = isActive
                    ? 'in-progress'
                    : isCompleted
                        ? 'complete'
                        : 'default'; // Icon status: active overrides completed
                const hasLine = index < steps.length - 1; // Whether connector follows
                const isClickable = onStepClick && index <= effectiveCompleted && index !== activeStep; // Only completed or next step is clickable
                const stepLabel = label || `${t('step')} ${index + 1}`; // Resolved label text
                const stepClass = isVertical
                    ? 'flex gap-(--mui-tokens-spacing-4) items-start'
                    : 'flex flex-col gap-(--mui-tokens-spacing-4) items-start p-(--mui-tokens-spacing-3)'; // Step wrapper class
                const flexClass = hasLine
                    ? isVertical
                        ? 'flex-1'
                        : 'flex-1 min-h-px'
                    : 'shrink-0'; // Stretch or hug based on line

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
                                stepClass,
                                flexClass,
                                isClickable && 'cursor-pointer'
                            )
                        }
                        key={title}
                        onClick={handleClick}
                    >
                        <StepperProgress
                            active={!isAnimating && isActive}
                            completed={isCompleted}
                            hasLine={hasLine}
                            icon={icon}
                            isVertical={isVertical}
                            progress={progress}
                            status={status}
                            stepNumber={index + 1}
                        />
                        <StepperLabel
                            isVertical={isVertical}
                            label={stepLabel}
                            statusBadge={statusBadge}
                            title={title}
                        />
                    </div>
                );
            })}
        </div>
    );
}