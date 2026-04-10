import { TextField, TextFieldProps } from '@mui/material';
import { HTMLAttributesSpanElement } from '@type/common.type';
import { classMerge } from '@utils/css.util';

export interface CommonLabelInputProps {
    // Optional custom styling for the outer container
    containerClassName?: string;

    // Properties passed to the underlying MUI TextField
    inputProps?: TextFieldProps;

    // Whether to display the mandatory asterisk indicator
    isRequired?: boolean;

    // Properties passed to the label span element
    labelProps?: HTMLAttributesSpanElement;
}

/**
 * CommonLabelInput
 *
 * A layout component that standardizes the pairing of a label and a TextField.
 * It manages vertical spacing and provides a built-in required asterisk indicator.
 *
 * @example
 * <CommonLabelInput
 *  labelProps={{ label: 'Username', isRequired: true }}
 *  inputProps={{ placeholder: 'Enter your name' }}
 * />
 */
export default function CommonLabelInput({
    containerClassName,
    inputProps,
    labelProps,
    isRequired
}: CommonLabelInputProps) {
    const resolvedContainerClassName = classMerge(
        'flex flex-col gap-[4px] relative w-full',
        containerClassName
    ); // Resolved container class merge
    const { title, className } = labelProps ?? {}; // Destructured label properties
    const resolvedLabelClassName = classMerge(
        'tw_body_small_bold flex gap-[4px]',
        className
    ); // Resolved label styling

    return (
        <div className={resolvedContainerClassName}>
            {labelProps && (
                <span
                    {...labelProps}
                    className={resolvedLabelClassName}
                >
                    {title}
                    {isRequired && (
                        <span className="text-[20px] text-[var(--mui-tokens-color-state-error)]">
                            *
                        </span>
                    )}
                </span>
            )}
            <TextField {...inputProps} />
        </div>
    );
}