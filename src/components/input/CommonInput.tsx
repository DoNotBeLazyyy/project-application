import { IconButton, InputAdornment, TextField, TextFieldProps } from '@mui/material';
import { EyeIcon, EyeSlashIcon } from '@phosphor-icons/react';
import { classMerge } from '@utils/css.util';
import { forwardRef, MouseEvent, useMemo, useState } from 'react';

export type CommonInputProps = TextFieldProps & {
    // Optional custom styling for the outer container
    containerClassName?: string;

    // Whether a password field renders a built-in visibility toggle
    hasPasswordToggle?: boolean;

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
    fullWidth,
    hasPasswordToggle,
    isRequired,
    isRoundedFull,
    label,
    labelClassName,
    slotProps,
    type,
    ...props
}, ref) => {
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);
    const isPasswordField = Boolean(hasPasswordToggle) && type === 'password';
    const resolvedSlotProps = useMemo<TextFieldProps['slotProps']>(function() {
        if (!isPasswordField) {
            return slotProps;
        }

        return {
            input: {
                endAdornment: (
                    <InputAdornment position="end">
                        <IconButton
                            aria-label={isPasswordVisible
                                ? 'Hide password'
                                : 'Show password'
                            }
                            edge="end"
                            size="small"
                            tabIndex={-1}
                            onClick={function() {
                                setIsPasswordVisible(function(previous) {
                                    return !previous;
                                });
                            }}
                            onMouseDown={function(event: MouseEvent<HTMLButtonElement>) {
                                event.preventDefault();
                            }}
                        >
                            {isPasswordVisible
                                ? <EyeSlashIcon size={20} />
                                : <EyeIcon size={20} />
                            }
                        </IconButton>
                    </InputAdornment>
                )
            }
        };
    }, [isPasswordField, isPasswordVisible, slotProps]);

    return (
        <div
            className={
                classMerge(
                    'flex flex-col gap-(--mui-tokens-spacing-2) relative',
                    fullWidth && 'w-full',
                    containerClassName
                )
            }
        >
            {label && (
                <span
                    className={
                        classMerge(
                            'tw_body_small_bold flex gap-(--mui-tokens-spacing-2)',
                            labelClassName
                        )
                    }
                >
                    {label}
                    {isRequired && (
                        <span className="text-(--mui-tokens-color-red-500) text-(length:--mui-tokens-fontSize-lg)">
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
                slotProps={resolvedSlotProps}
                type={isPasswordField && isPasswordVisible
                    ? 'text'
                    : type
                }
            />
        </div>
    );
});
CommonInput.displayName = 'CommonInput';

export default CommonInput;