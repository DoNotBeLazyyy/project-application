import FormLabel from '@components/form/FormLabel';
import { AdapterLuxon } from '@mui/x-date-pickers/AdapterLuxon';
import { DateTimePicker, DateTimePickerProps } from '@mui/x-date-pickers/DateTimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { classMerge } from '@utils/css.util';
import { checkForMessage } from '@utils/form.util';
import { DateTime } from 'luxon';
import { ReactNode, useRef, useState } from 'react';
import { FieldValues, useController, UseControllerProps } from 'react-hook-form';

export interface CommonDateTimePickerProps extends Omit<DateTimePickerProps, 'value' | 'onChange'> {
    containerClassName?: string;
    labelClassName?: string;
    label?: ReactNode;
    description?: ReactNode;
    isRequired?: boolean;
    defaultOpenErrorTooltip?: boolean;
    isFirstError?: boolean;
    error?: boolean;
    helperText?: string;
    fullWidth?: boolean;
    hasHelper?: boolean;
    size?: 'small' | 'medium' | 'large';
}

export type ValidCommonDateTimePickerProps<T extends FieldValues = FieldValues> =
    CommonDateTimePickerProps & UseControllerProps<T>;

export default function ValidCommonDateTimePicker<T extends FieldValues = FieldValues>({
    className,
    containerClassName,
    control,
    defaultOpenErrorTooltip,
    description,
    disabled,
    error: errorProp,
    fullWidth = true,
    hasHelper = true,
    helperText: helperTextProp,
    isFirstError,
    isRequired,
    label,
    labelClassName,
    name,
    readOnly,
    rules,
    size = 'medium',
    ...props
}: ValidCommonDateTimePickerProps<T>) {
    const {
        field: { ref, value, onChange },
        fieldState,
        formState
    } = useController({ control, name, rules });

    const [isOpen, setIsOpen] = useState(false);
    const isClosing = useRef(false);

    const resolvedValue = value
        ? DateTime.fromISO(value)
        : null;

    const firstErrorKey = checkForMessage(formState.errors).firstError?.key;
    const resolvedIsFirstError = isFirstError ?? Boolean(fieldState.error && firstErrorKey === name);

    const isNonInteractive = Boolean(disabled || readOnly);
    const isError = errorProp ?? !!fieldState.error;
    const errorMessage = fieldState.error?.message ?? helperTextProp;
    const labelErrorMessage = label && isError ? errorMessage : undefined;
    const labelDescription = description ?? (label && !isError ? helperTextProp : undefined);

    function handleChange(date: DateTime | null) {
        if (isNonInteractive) {
            return;
        }
        onChange(
            date
                ? date.toISO()
                : ''
        );
    }

    function handleClose() {
        isClosing.current = true;
        setIsOpen(false);
        setTimeout(function() {
            isClosing.current = false;
        }, 300);
    }

    function handleOpen() {
        if (isNonInteractive) {
            return;
        }
        setIsOpen(true);
    }

    function handleFocus() {
        if (isNonInteractive) {
            return;
        }
        if (!isOpen && !isClosing.current) {
            setIsOpen(true);
        }
    }

    const externalTextFieldProps = typeof props.slotProps?.textField === 'object'
        ? props.slotProps.textField
        : undefined;
    const { onFocus: externalOnFocus, variant: _variant, className: externalClassName, size: externalSize, ...restTextFieldProps } = externalTextFieldProps ?? {};
    const resolvedSize = externalSize ?? size;

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
                <FormLabel
                    className={classMerge('tw_body_small_bold', labelClassName)}
                    defaultOpenErrorTooltip={defaultOpenErrorTooltip || resolvedIsFirstError}
                    description={labelDescription}
                    errorMessage={labelErrorMessage}
                    isRequired={isRequired || Boolean(rules?.required)}
                    label={label}
                />
            )}
            <LocalizationProvider dateAdapter={AdapterLuxon}>
                <DateTimePicker
                    timeSteps={{ hours: 1, minutes: 1, seconds: 1 }}
                    {...props}
                    className={className}
                    disabled={disabled}
                    inputRef={ref}
                    open={isNonInteractive
                        ? false
                        : isOpen}
                    readOnly={readOnly}
                    slotProps={{
                        ...props.slotProps,
                        openPickerButton: {
                            disabled: isNonInteractive,
                            ...(typeof props.slotProps?.openPickerButton === 'object'
                                ? props.slotProps.openPickerButton
                                : {})
                        },
                        textField: {
                            className: externalClassName,
                            disabled,
                            error: isError,
                            fullWidth,
                            helperText: label ? undefined : (hasHelper ? errorMessage : undefined),
                            label: '',
                            size: resolvedSize,
                            variant: 'outlined' as const,
                            ...restTextFieldProps,
                            onFocus: () => {
                                if (isNonInteractive) {
                                    return;
                                }
                                handleFocus();
                            },
                            sx: [
                                ...(disabled
                                    ? [{
                                        pointerEvents: 'none' as const
                                    }]
                                    : []),
                                ...(externalTextFieldProps?.sx
                                    ? (Array.isArray(externalTextFieldProps.sx)
                                        ? externalTextFieldProps.sx
                                        : [externalTextFieldProps.sx])
                                    : [])
                            ]
                        }
                    }}
                    value={resolvedValue}
                    onChange={handleChange}
                    onClose={handleClose}
                    onOpen={handleOpen}
                />
            </LocalizationProvider>
        </div>
    );
}