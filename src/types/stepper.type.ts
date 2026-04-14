import { StatusBadgeProps } from '@type/status-badge.type';
import { ReactNode } from 'react';

// Visual state of a step in the stepper
export type StepStatus = 'complete' | 'default' | 'in-progress';

// Stepper layout direction
export type StepperOrientation = 'horizontal' | 'vertical';

export interface StepConfig {
    // Custom icon to display inside the step circle (overrides default number/check)
    icon?: ReactNode;

    // The step label (e.g. "Step 1") — auto-generated from index if omitted
    label?: string;

    // Form completion progress for this step (0–100). When set on the active step,
    // the connector bar fills to this percentage instead of the default 50%.
    progress?: number;

    // Optional status badge displayed below the title
    statusBadge?: StatusBadgeProps;

    // The main title of the step
    title: string;
}