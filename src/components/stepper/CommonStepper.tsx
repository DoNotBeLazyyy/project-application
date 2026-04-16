import StepperItem from '@components/stepper/StepperItem';
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
     * @returns
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
                    isVertical
                        ? 'flex flex-col'
                        : 'flex flex-row items-start w-full',
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
            }, index) => (
                <StepperItem
                    activeStep={activeStep}
                    animatedCompleted={animatedCompleted}
                    effectiveCompleted={effectiveCompleted}
                    icon={icon}
                    index={index}
                    isVertical={isVertical}
                    key={index}
                    label={label || `${t('step')} ${index + 1}`}
                    progress={progress}
                    statusBadge={statusBadge}
                    title={title}
                    totalSteps={steps.length}
                    onStepClick={onStepClick}
                />
            ))}
        </div>
    );
}