import { AdapterLuxon } from '@mui/x-date-pickers/AdapterLuxon';
import { DatePicker, DatePickerProps } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { classMerge } from '@utils/css.util';
import { DateTime } from 'luxon';
import { useRef, useState } from 'react';
import { FieldValues, useController, UseControllerProps } from 'react-hook-form';

export interface CommonDatePickerProps extends Omit<DatePickerProps, 'value' | 'onChange'> {
    error?: boolean;
    helperText?: string;
    fullWidth?: boolean;
    hasHelper?: boolean;
    size?: 'small' | 'medium' | 'large';
}

export type ValidCommonDatePickerProps<T extends FieldValues = FieldValues> =
    CommonDatePickerProps & UseControllerProps<T>;

export interface StandaloneCommonDatePickerProps extends Omit<DatePickerProps, 'value' | 'onChange'> {
    value?: string | null;
    onChange: (dateStr: string) => void;
    error?: boolean;
    helperText?: string;
    fullWidth?: boolean;
    hasHelper?: boolean;
    disabled?: boolean;
    readOnly?: boolean;
    size?: 'small' | 'medium' | 'large';
}

export function CommonDatePicker({
    value,
    onChange,
    error: errorProp,
    hasHelper = false,
    helperText: helperTextProp,
    fullWidth = true,
    disabled,
    readOnly,
    size = 'large',
    ...props
}: StandaloneCommonDatePickerProps) {
    const [isOpen, setIsOpen] = useState(false);
    const isClosing = useRef(false);
    const resolvedValue = value
        ? DateTime.fromISO(value)
        : null;

    const isNonInteractive = Boolean(disabled || readOnly);

    function handleChange(date: DateTime | null) {
        if (isNonInteractive) {
            return;
        }
        onChange(
            date
                ? date.toISODate() || ''
                : ''
        );
    }

    function handleClose() {
        isClosing.current = true;
        setIsOpen(false);
        setTimeout(() => {
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
        <LocalizationProvider dateAdapter={AdapterLuxon}>
            <DatePicker
                {...props}
                disabled={disabled}
                open={isNonInteractive ? false : isOpen}
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
                        error: errorProp,
                        fullWidth,
                        helperText: hasHelper ? helperTextProp : undefined,
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
    );
}

export default function ValidCommonDatePicker<T extends FieldValues = FieldValues>({
    control,
    name,
    rules,
    error: errorProp,
    hasHelper = true,
    helperText: helperTextProp,
    fullWidth = true,
    disabled,
    readOnly,
    size = 'large',
    ...props
}: ValidCommonDatePickerProps<T>) {
    const {
        field: { ref, value, onChange },
        fieldState
    } = useController({ control, name, rules });
    const [isOpen, setIsOpen] = useState(false);
    const isClosing = useRef(false);
    const resolvedValue = value
        ? DateTime.fromISO(value)
        : null;

    const isNonInteractive = Boolean(disabled || readOnly);

    function handleChange(date: DateTime | null) {
        if (isNonInteractive) {
            return;
        }
        onChange(
            date
                ? date.toISODate()
                : ''
        );
    }

    function handleClose() {
        isClosing.current = true;

        setIsOpen(false);
        setTimeout(() => {
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
        <LocalizationProvider dateAdapter={AdapterLuxon}>
            <DatePicker
                {...props}
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
                        error: errorProp ?? !!fieldState.error,
                        fullWidth,
                        helperText: hasHelper
                            ? fieldState.error?.message ?? helperTextProp
                            : undefined,
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
    );
}