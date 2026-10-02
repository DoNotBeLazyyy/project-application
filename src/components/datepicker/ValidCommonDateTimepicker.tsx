import { AdapterLuxon } from '@mui/x-date-pickers/AdapterLuxon';
import { DateTimePicker, DateTimePickerProps } from '@mui/x-date-pickers/DateTimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { classMerge } from '@utils/css.util';
import { DateTime } from 'luxon';
import { useRef, useState } from 'react';
import { FieldValues, useController, UseControllerProps } from 'react-hook-form';

export interface CommonDateTimePickerProps extends Omit<DateTimePickerProps, 'value' | 'onChange'> {
    error?: boolean;
    helperText?: string;
    fullWidth?: boolean;
    hasHelper?: boolean;
}

export type ValidCommonDateTimePickerProps<T extends FieldValues = FieldValues> =
    CommonDateTimePickerProps & UseControllerProps<T>;

export default function ValidCommonDateTimePicker<T extends FieldValues = FieldValues>({
    control,
    name,
    rules,
    error: errorProp,
    hasHelper = true,
    helperText: helperTextProp,
    fullWidth = true,
    disabled,
    readOnly,
    ...props
}: ValidCommonDateTimePickerProps<T>) {
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
    const { onFocus: externalOnFocus, variant: _variant, className: externalClassName, ...restTextFieldProps } = externalTextFieldProps ?? {};

    return (
        <LocalizationProvider dateAdapter={AdapterLuxon}>
            <DateTimePicker
                timeSteps={{ hours: 1, minutes: 1, seconds: 1 }}
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
                        size: 'medium',
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