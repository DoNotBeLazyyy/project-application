import InputClearAdornment from '@components/input/InputClearAdornment';
import {
    IconButton, InputAdornment, InputBaseProps, TextField, TextFieldProps
} from '@mui/material';
import { EyeIcon, EyeSlashIcon } from '@phosphor-icons/react';
import { ChangeEventInputTextarea } from '@type/common.type';
import { classMerge } from '@utils/css.util';
import { buildElementChangeEvent, clearInputElement, hasClearableValue } from '@utils/input.util';
import {
    forwardRef, InputHTMLAttributes, MouseEvent, MutableRefObject, useCallback, useEffect, useRef, useState
} from 'react';

export type CommonInputProps = TextFieldProps & {
    // Optional custom styling for the outer container
    containerClassName?: string;

    // Whether the field renders a built-in clear button while it holds a value
    hasClearButton?: boolean;

    // Whether a password field renders a built-in visibility toggle
    hasPasswordToggle?: boolean;

    // Whether to display the mandatory asterisk indicator
    isRequired?: boolean;

    // Whether to make the input pill-shaped
    isRoundedFull?: boolean;

    // Properties passed to the label span element
    labelClassName?: string;

    // Callback invoked after the built-in clear button empties the field
    onClear?: () => void;
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
    hasClearButton = true,
    hasPasswordToggle,
    inputRef,
    isRequired,
    isRoundedFull,
    label,
    labelClassName,
    slotProps,
    type,
    value,
    onChange,
    onClear,
    ...props
}, ref) => {
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);
    const [hasContent, setHasContent] = useState(hasClearableValue(value ?? props.defaultValue));
    const inputElementRef = useRef<HTMLInputElement | null>(null);
    const isPasswordField = Boolean(hasPasswordToggle) && type === 'password';
    const inputSlotProps = slotProps?.input as InputBaseProps | undefined;
    const htmlInputSlotProps = slotProps?.htmlInput as InputHTMLAttributes<HTMLInputElement> | undefined;
    const isReadOnly = Boolean(inputSlotProps?.readOnly) || Boolean(htmlInputSlotProps?.readOnly);
    const isControlled = value !== undefined;

    useEffect(function() {
        if (isControlled) {
            setHasContent(hasClearableValue(value));
        }
    }, [isControlled, value]);

    const handleAssignInputRef = useCallback(function(element: HTMLInputElement | null) {
        inputElementRef.current = element;

        if (typeof inputRef === 'function') {
            inputRef(element);
            return;
        }

        if (inputRef) {
            (inputRef as MutableRefObject<HTMLInputElement | null>).current = element;
        }
    }, [inputRef]);

    function handleChange(event: ChangeEventInputTextarea) {
        setHasContent(event.target.value.length > 0);
        onChange?.(event);
    }

    function handleClear() {
        const element = inputElementRef.current;

        clearInputElement(element);

        if (element) {
            handleChange(buildElementChangeEvent(element));
        }

        onClear?.();
    }

    const isClearVisible = hasClearButton
        && !props.disabled
        && !isReadOnly
        && hasContent;

    const clearAdornment = isClearVisible
        ? <InputClearAdornment onClear={handleClear} />
        : null;

    const passwordAdornment = isPasswordField
        ? (
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
        : null;

    const resolvedSlotProps = clearAdornment || passwordAdornment
        ? {
            ...slotProps,
            input: {
                ...inputSlotProps,
                endAdornment: (
                    <>
                        {clearAdornment}
                        {inputSlotProps?.endAdornment}
                        {passwordAdornment}
                    </>
                )
            }
        } as TextFieldProps['slotProps']
        : slotProps;

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
                inputRef={handleAssignInputRef}
                ref={ref}
                slotProps={resolvedSlotProps}
                type={isPasswordField && isPasswordVisible
                    ? 'text'
                    : type
                }
                value={value}
                onChange={handleChange}
            />
        </div>
    );
});
CommonInput.displayName = 'CommonInput';

export default CommonInput;