import { AdapterLuxon } from '@mui/x-date-pickers/AdapterLuxon';
import { DateTimePicker, DateTimePickerProps } from '@mui/x-date-pickers/DateTimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
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

    function handleChange(date: DateTime | null) {
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
        setIsOpen(true);
    }

    function handleFocus() {
        if (!isOpen && !isClosing.current) {
            setIsOpen(true);
        }
    }

    return (
        <LocalizationProvider dateAdapter={AdapterLuxon}>
            <DateTimePicker
                timeSteps={{ hours: 1, minutes: 1, seconds: 1 }}
                {...props}
                inputRef={ref}
                open={isOpen}
                slotProps={{
                    ...props.slotProps,
                    textField: {
                        ...props.slotProps?.textField,
                        error: errorProp ?? !!fieldState.error,
                        helperText: hasHelper
                            ? fieldState.error?.message ?? helperTextProp
                            : undefined,
                        fullWidth,
                        size: 'medium',
                        variant: 'outlined',
                        onFocus: handleFocus
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