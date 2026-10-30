import FormLabel from '@components/form/FormLabel';
import {
    INPUT_HEIGHT_LARGE,
    INPUT_HEIGHT_MEDIUM,
    INPUT_HEIGHT_SMALL,
    INPUT_HEIGHT_TOUCH
} from '@constants/theme/input-state.constant';
import { AdapterLuxon } from '@mui/x-date-pickers/AdapterLuxon';
import { DateTimePicker, DateTimePickerProps } from '@mui/x-date-pickers/DateTimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { classMerge } from '@utils/css.util';
import {
    blurActiveElementWithin, checkForMessage, clearFieldError, ensureSubmitValidationMode, FORM_ERROR_EVENT, FormErrorEventDetail, formatFieldLabel, getLastWindowFocusTime
} from '@utils/form.util';
import { DateTime } from 'luxon';
import { ReactNode, useEffect, useMemo, useRef, useState } from 'react';
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

function getDateTimepickerSizeSx(size?: 'small' | 'medium' | 'large' | string) {
    if (size === 'small') {
        return {
            '& .MuiPickersInputBase-root, & .MuiPickersOutlinedInput-root, & .MuiInputBase-root': {
                height: `${INPUT_HEIGHT_SMALL} !important`,
                maxHeight: `${INPUT_HEIGHT_SMALL} !important`,
                paddingLeft: 'var(--mui-tokens-spacing-3) !important',
                paddingRight: 'var(--mui-tokens-spacing-2) !important',
                paddingTop: '0 !important',
                paddingBottom: '0 !important',
                boxSizing: 'border-box' as const,
                fontSize: 'var(--mui-tokens-fontSize-xs, 0.75rem)',
                display: 'flex',
                alignItems: 'center',
                '@media (pointer: coarse)': {
                    height: `${INPUT_HEIGHT_TOUCH} !important`,
                    maxHeight: `${INPUT_HEIGHT_TOUCH} !important`
                }
            },
            '& .MuiPickersInputBase-sectionsContainer': {
                padding: '0 !important',
                marginRight: 'auto'
            },
            '& .MuiInputAdornment-root': {
                marginLeft: 'var(--mui-tokens-spacing-2) !important',
                marginRight: '0 !important',
                display: 'flex',
                alignItems: 'center'
            },
            '& .MuiInputAdornment-root .MuiIconButton-root, & .MuiIconButton-edgeEnd': {
                margin: '0 !important',
                marginRight: '0 !important',
                padding: 'var(--mui-tokens-spacing-1) !important',
                width: '1.75rem !important',
                height: '1.75rem !important',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            },
            '& .MuiInputAdornment-root svg': {
                height: '1rem !important',
                width: '1rem !important'
            }
        };
    }
    if (size === 'large') {
        return {
            '& .MuiPickersInputBase-root, & .MuiPickersOutlinedInput-root, & .MuiInputBase-root': {
                height: `${INPUT_HEIGHT_LARGE} !important`,
                maxHeight: `${INPUT_HEIGHT_LARGE} !important`,
                paddingLeft: 'var(--mui-tokens-spacing-5) !important',
                paddingRight: 'var(--mui-tokens-spacing-4) !important',
                paddingTop: '0 !important',
                paddingBottom: '0 !important',
                boxSizing: 'border-box' as const,
                display: 'flex',
                alignItems: 'center'
            },
            '& .MuiInputAdornment-root': {
                marginLeft: 'var(--mui-tokens-spacing-3) !important',
                marginRight: '0 !important'
            },
            '& .MuiInputAdornment-root .MuiIconButton-root, & .MuiIconButton-edgeEnd': {
                margin: '0 !important',
                marginRight: '0 !important'
            }
        };
    }
    return {
        '& .MuiPickersInputBase-root, & .MuiPickersOutlinedInput-root, & .MuiInputBase-root': {
            height: `${INPUT_HEIGHT_MEDIUM} !important`,
            maxHeight: `${INPUT_HEIGHT_MEDIUM} !important`,
            paddingLeft: 'var(--mui-tokens-spacing-3) !important',
            paddingRight: 'var(--mui-tokens-spacing-2) !important',
            paddingTop: '0 !important',
            paddingBottom: '0 !important',
            boxSizing: 'border-box' as const,
            display: 'flex',
            alignItems: 'center'
        },
        '& .MuiInputAdornment-root': {
            marginLeft: 'var(--mui-tokens-spacing-2) !important',
            marginRight: '0 !important'
        },
        '& .MuiInputAdornment-root .MuiIconButton-root, & .MuiIconButton-edgeEnd': {
            margin: '0 !important',
            marginRight: '0 !important'
        }
    };
}

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
    size = 'large',
    ...props
}: ValidCommonDateTimePickerProps<T>) {
    ensureSubmitValidationMode(control);
    const {
        field: { ref, value, onChange },
        fieldState,
        formState
    } = useController({ control, name, rules });

    const containerRef = useRef<HTMLDivElement | null>(null);
    const blurTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const lastPointerDownTimeRef = useRef<number>(0);
    const [isOpen, setIsOpen] = useState(false);
    const isClosing = useRef(false);

    const resolvedValue = useMemo(() => {
        if (!value) return null;
        if (DateTime.isDateTime(value)) return value;
        if ((value as unknown) instanceof Date) return DateTime.fromJSDate(value as Date);
        if (typeof value === 'string') {
            const iso = DateTime.fromISO(value);
            if (iso.isValid) return iso;
            const sql = DateTime.fromSQL(value);
            if (sql.isValid) return sql;
            const jsDate = new Date(value);
            if (!Number.isNaN(jsDate.getTime())) return DateTime.fromJSDate(jsDate);
        }
        return null;
    }, [value]);

    const firstErrorKey = checkForMessage(formState.errors).firstError?.key;
    const resolvedIsFirstError = isFirstError ?? Boolean(fieldState.error && firstErrorKey === name);

    const isNonInteractive = Boolean(disabled || readOnly);
    const isError = errorProp ?? !!fieldState.error;
    const resolvedErrorMessage = fieldState.error
        ? (fieldState.error.message && fieldState.error.message.trim().length > 0
            ? fieldState.error.message
            : `${formatFieldLabel(name)} is required.`)
        : helperTextProp;
    const labelErrorMessage = label && isError
        ? resolvedErrorMessage
        : undefined;
    const labelDescription = description ?? (label && !isError
        ? helperTextProp
        : undefined);

    const blurPickerInput = () => {
        if (blurTimerRef.current) {
            clearTimeout(blurTimerRef.current);
        }
        blurTimerRef.current = setTimeout(() => {
            blurActiveElementWithin(containerRef.current);
        }, 50);
    };

    useEffect(() => {
        return () => {
            if (blurTimerRef.current) {
                clearTimeout(blurTimerRef.current);
            }
        };
    }, []);

    function handleChange(date: DateTime | null) {
        if (fieldState.error) {
            clearFieldError(control, name);
        }
        if (isNonInteractive) {
            return;
        }
        onChange(
            date
                ? date.toISO()
                : ''
        );
    }

    function handleAccept(date: DateTime | null) {
        blurPickerInput();
        if (typeof (props as any).onAccept === 'function') {
            (props as any).onAccept(date);
        }
    }

    function handleClose() {
        isClosing.current = true;
        setIsOpen(false);
        blurPickerInput();
        if (typeof (props as any).onClose === 'function') {
            (props as any).onClose();
        }
        setTimeout(function() {
            isClosing.current = false;
        }, 300);
    }

    function handleOpen() {
        if (isNonInteractive) {
            return;
        }
        setIsOpen(true);
        if (typeof (props as any).onOpen === 'function') {
            (props as any).onOpen();
        }
    }

    function handleFocus() {
        if (isNonInteractive) {
            return;
        }
        // If focus was triggered by the window/tab regaining focus rather than user interaction, do not reopen
        if (Date.now() - getLastWindowFocusTime() < 250 && Date.now() - lastPointerDownTimeRef.current > 250) {
            return;
        }
        if (!isOpen && !isClosing.current) {
            setIsOpen(true);
            if (typeof (props as any).onOpen === 'function') {
                (props as any).onOpen();
            }
        }
    }

    useEffect(() => {
        if (resolvedIsFirstError && !isNonInteractive) {
            const timer = setTimeout(() => {
                const element = document.querySelector<HTMLInputElement>(`[name="${name}"]`);
                if (element) {
                    element.focus({ preventScroll: true });
                    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }, 50);
            return () => clearTimeout(timer);
        }
    }, [resolvedIsFirstError, formState.submitCount, name, isNonInteractive]);

    useEffect(() => {
        function handleFormError(event: Event) {
            if (isNonInteractive) return;
            const detail = (event as CustomEvent<FormErrorEventDetail>).detail;
            if (detail?.firstErrorField === name || (fieldState.error && resolvedIsFirstError)) {
                const element = document.querySelector<HTMLInputElement>(`[name="${name}"]`);
                if (element) {
                    element.focus({ preventScroll: true });
                    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }
        }

        if (typeof window !== 'undefined') {
            window.addEventListener(FORM_ERROR_EVENT, handleFormError);
            return () => window.removeEventListener(FORM_ERROR_EVENT, handleFormError);
        }
    }, [name, resolvedIsFirstError, fieldState.error, isNonInteractive]);

    const externalTextFieldProps = typeof props.slotProps?.textField === 'object'
        ? props.slotProps.textField
        : undefined;
    const { className: externalClassName, onFocus: externalOnFocus, size: externalSize, ...restTextFieldProps } = externalTextFieldProps ?? {};
    const resolvedSize = externalSize ?? size;

    return (
        <div
            ref={containerRef}
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
                    className={labelClassName}
                    defaultOpenErrorTooltip={defaultOpenErrorTooltip ?? resolvedIsFirstError}
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
                            size: resolvedSize === 'large' ? 'medium' : 'small',
                            edge: false as any,
                            sx: {
                                margin: 0,
                                marginRight: 0
                            },
                            ...(typeof props.slotProps?.openPickerButton === 'object'
                                ? props.slotProps.openPickerButton
                                : {})
                        },
                        textField: {
                            name,
                            className: externalClassName,
                            disabled,
                            error: isError,
                            fullWidth,
                            helperText: label
                                ? undefined
                                : (hasHelper
                                    ? resolvedErrorMessage
                                    : undefined),
                            label: '',
                            ...restTextFieldProps,
                            size: (resolvedSize === 'large'
                                ? 'medium'
                                : resolvedSize) as 'small' | 'medium' | undefined,
                            variant: 'outlined' as unknown as 'standard',
                            onPointerDown: (e: any) => {
                                lastPointerDownTimeRef.current = Date.now();
                                if (typeof (externalTextFieldProps as any)?.onPointerDown === 'function') {
                                    (externalTextFieldProps as any).onPointerDown(e);
                                }
                            },
                            onMouseDown: (e: any) => {
                                lastPointerDownTimeRef.current = Date.now();
                                if (typeof (externalTextFieldProps as any)?.onMouseDown === 'function') {
                                    (externalTextFieldProps as any).onMouseDown(e);
                                }
                            },
                            onFocus: (e: any) => {
                                if (isNonInteractive) {
                                    return;
                                }
                                handleFocus();
                                if (typeof externalOnFocus === 'function') {
                                    (externalOnFocus as (e: any) => void)(e);
                                }
                            },
                            sx: [
                                getDateTimepickerSizeSx(resolvedSize),
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
                    onAccept={handleAccept}
                    onChange={handleChange}
                    onClose={handleClose}
                    onOpen={handleOpen}
                />
            </LocalizationProvider>
        </div>
    );
}