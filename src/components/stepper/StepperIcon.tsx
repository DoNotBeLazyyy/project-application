import { StepStatus } from '@type/stepper.type';
import { classMerge } from '@utils/css.util';
import { CheckIcon } from '@phosphor-icons/react';
import { ReactNode } from 'react';

interface StepperIconProps {
    // Custom icon to render inside the circle (overrides default)
    icon?: ReactNode;

    // The visual state of the step icon
    status: StepStatus;

    // The step number (1-based), used as default icon for non-complete steps
    stepNumber: number;
}

/**
 * StepperIcon
 *
 * Renders a circular step indicator. By default:
 * - Default/In Progress: displays the step number
 * - Complete: displays a checkmark
 *
 * Pass a custom `icon` to override the default content for any state.
 *
 * @example
 * <StepperIcon status="in-progress" stepNumber={2} />
 * <StepperIcon icon={<GearIcon />} status="default" stepNumber={1} />
 */
export default function StepperIcon({
    icon,
    status,
    stepNumber
}: StepperIconProps) {
    return (
        <div
            className={
                classMerge(
                    'duration-500 flex items-center justify-center rounded-full shrink-0 size-10 transition-colors',
                    status === 'complete'
                        ? 'bg-(--mui-tokens-color-state-success) border-[3px] border-(--mui-tokens-color-state-success)/30'
                        : status === 'in-progress'
                            ? 'bg-(--mui-tokens-color-brand-500) border-(length:--mui-tokens-stroke-3) border-(--mui-tokens-color-brand-600) border-solid'
                            : 'bg-(--mui-tokens-color-neutral-200) border-[3px] border-transparent'
                )
            }
        >
            {icon
                ? icon
                : status === 'complete'
                    ? <CheckIcon
                        className="shrink-0 size-5 text-(--mui-tokens-color-common-white)"
                        weight="bold"
                    />
                    : (
                        <span
                            className={
                                classMerge(
                                    'shrink-0 tw_body_normal_bold',
                                    status === 'default'
                                        ? 'text-(--mui-tokens-color-neutral-400)'
                                        : 'text-(--mui-tokens-color-common-white)'
                                )
                            }
                        >
                            {stepNumber}
                        </span>
                    )
            }
        </div>
    );
}