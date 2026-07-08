import { AdapterLuxon } from '@mui/x-date-pickers/AdapterLuxon';
import { DatePicker, DatePickerProps } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DateTime } from 'luxon';
import { useRef, useState } from 'react';
import { FieldValues, useController, UseControllerProps } from 'react-hook-form';

export interface CommonDatePickerProps extends Omit<DatePickerProps, 'value' | 'onChange'> {
    error?: boolean;
    helperText?: string;
    fullWidth?: boolean;
    hasHelper?: boolean;
}

export type ValidCommonDatePickerProps<T extends FieldValues = FieldValues> =
    CommonDatePickerProps & UseControllerProps<T>;

export default function ValidCommonDatePicker<T extends FieldValues = FieldValues>({
    control,
    name,
    rules,
    error: errorProp,
    hasHelper,
    helperText: helperTextProp,
    fullWidth = true,
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

    function handleChange(date: DateTime | null) {
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
        setIsOpen(true);
    }

    function handleFocus() {
        if (!isOpen && !isClosing.current) {
            setIsOpen(true);
        }
    }

    return (
        <LocalizationProvider dateAdapter={AdapterLuxon}>
            <DatePicker
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