import { TextField, TextFieldProps } from '@mui/material';
import { classMerge } from '@utils/css.util';
import { forwardRef } from 'react';

export type CommonInputProps = TextFieldProps & {
    // Optional custom styling for the outer container
    containerClassName?: string;

    // Whether to display the mandatory asterisk indicator
    isRequired?: boolean;

    // Whether to make the input pill-shaped
    isRoundedFull?: boolean;

    // Properties passed to the label span element
    labelClassName?: string;
}

/**
 * CommonInput
 *
 * A customizable styled single-line text input built on MUI TextField.
 * Styles and sizings are handled natively through the MUI global theme.
 *
 * @example
 * <CommonInput
 * placeholder="Search"
 * size="large"
 * variant="outlined"
 * />
 */
const CommonInput = forwardRef<HTMLDivElement, CommonInputProps>(({
    className,
    containerClassName,
    isRequired,
    isRoundedFull,
    label,
    labelClassName,
    fullWidth,
    ...props
}, ref) => {
    return (
        <div
            className={
                classMerge(
                    'flex flex-col gap-[var(--mui-tokens-spacing-2)] relative',
                    fullWidth && 'w-full',
                    containerClassName
                )
            }
        >
            {label && (
                <span
                    className={
                        classMerge(
                            'tw_body_small_bold flex gap-[var(--mui-tokens-spacing-2)]',
                            labelClassName
                        )
                    }
                >
                    {label}
                    {isRequired && (
                        <span className="text-[length:var(--mui-tokens-fontSize-lg)] text-[var(--mui-tokens-color-state-error)]">
                            *
                        </span>
                    )}
                </span>
            )}
            <TextField
                {...props}
                className={
                    classMerge(
                        className,
                        isRoundedFull && 'common_input_rounded_full'
                    )
                }
                fullWidth={fullWidth}
                ref={ref}
            />
        </div>
    );
});
CommonInput.displayName = 'CommonInput';

export default CommonInput;