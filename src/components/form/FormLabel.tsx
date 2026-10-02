import CommonInfoTooltip from '@components/tooltip/CommonInfoTooltip';
import { classMerge } from '@utils/css.util';
import { ReactNode } from 'react';

export interface FormLabelProps {
    // The field's visible name
    label: ReactNode;

    // Additional class name for the label row
    className?: string;

    /** Guidance about the field, revealed by an info icon beside the label. */
    description?: ReactNode;

    /** The field's current validation message, revealed by a danger icon. */
    errorMessage?: ReactNode;

    // Whether to display the mandatory asterisk indicator
    isRequired?: boolean;

    /** Whether to open the error tooltip by default (for the first invalid field) */
    defaultOpenErrorTooltip?: boolean;
    isFirstError?: boolean;
}

/**
 * FormLabel
 *
 * The label row for a form control, carrying the field's guidance and its
 * validation message as icons rather than as text below the input.
 *
 * Text under an input has to appear and disappear as the user types, which
 * resizes the field and shifts everything beneath it. Hanging both messages off
 * the label keeps the form's layout fixed: the icons occupy the label's own
 * line, which is always rendered. Each opens on hover and on click, so the copy
 * is reachable without a pointer.
 *
 * @example
 * <FormLabel
 *  description="Shown on printed documents."
 *  errorMessage={errors.institution_name?.message}
 *  isRequired
 *  label="Institution name"
 * />
 */
export default function FormLabel({
    className,
    defaultOpenErrorTooltip,
    description,
    errorMessage,
    isFirstError,
    isRequired,
    label
}: FormLabelProps) {
    return (
        <span
            className={
                classMerge(
                    'flex font-medium gap-(--mui-tokens-spacing-2) items-center min-h-6 text-(--mui-palette-text-primary) text-sm',
                    className
                )
            }
        >
            <span className="min-w-0">
                {label}
            </span>

            {isRequired && (
                <span className="text-(--mui-tokens-color-red-500) text-(length:--mui-tokens-fontSize-lg) leading-none">
                    *
                </span>
            )}

            {description && (
                <CommonInfoTooltip
                    content={description}
                    label="About this field"
                    size={16}
                />
            )}

            {errorMessage && (
                <CommonInfoTooltip
                    content={errorMessage}
                    defaultOpen={Boolean(defaultOpenErrorTooltip || isFirstError)}
                    label="This field has a problem"
                    size={16}
                    variant="error"
                />
            )}
        </span>
    );
}