import CommonSelect, { CommonSelectProps } from '@components/select/CommonSelect';
import { InputChangeEvent } from '@type/common.type';
import {
    checkForMessage, clearFieldError, ensureSubmitValidationMode, FORM_ERROR_EVENT, FormErrorEventDetail, formatFieldLabel
} from '@utils/form.util';
import { useEffect, useRef, useState } from 'react';
import { FieldValues, useController, UseControllerProps } from 'react-hook-form';

export type ValidCommonSelectProps<T extends FieldValues = FieldValues> =
    Omit<CommonSelectProps, 'value'> & UseControllerProps<T> & {
        hasHelper?: boolean;
    };

export default function ValidCommonSelect<T extends FieldValues = FieldValues>({
    control,
    name,
    rules,
    error: errorProp,
    hasHelper = true,
    helperText: helperTextProp,
    disabled,
    readOnly,
    onChange: onDefaultChange,
    ...props
}: ValidCommonSelectProps<T>) {
    ensureSubmitValidationMode(control);
    const {
        field: { ref, value, onChange },
        fieldState,
        formState
    } = useController({ control, name, rules });
    const [isOpen, setIsOpen] = useState(false);
    const isClosing = useRef(false);

    const firstErrorKey = checkForMessage(formState.errors).firstError?.key;
    const isFirstError = Boolean(fieldState.error && firstErrorKey === name);
    const resolvedErrorMessage = fieldState.error
        ? (fieldState.error.message && fieldState.error.message.trim().length > 0
            ? fieldState.error.message
            : `${formatFieldLabel(name)} is required.`)
        : undefined;

    const isNonInteractive = Boolean(disabled || readOnly);

    function handleChange(event: InputChangeEvent) {
        if (isNonInteractive) return;
        if (fieldState.error) {
            clearFieldError(control, name);
        }
        onChange(event);
        onDefaultChange?.(event);
    }

    function handleClose() {
        isClosing.current = true;

        setIsOpen(false);
        setTimeout(() => {
            isClosing.current = false;
        }, 300);
    }

    function handleOpen() {
        if (isNonInteractive) return;
        setIsOpen(true);
    }

    function handleFocus() {
        if (isNonInteractive) return;
        if (!isOpen && !isClosing.current) {
            setIsOpen(true);
        }
    }

    useEffect(() => {
        if (isFirstError && !isNonInteractive) {
            setIsOpen(true);
            const timer = setTimeout(() => {
                const element = document.querySelector<HTMLElement>(`[name="${name}"]`);
                if (element) {
                    const combobox = element.parentElement?.querySelector<HTMLElement>('[role="combobox"], .MuiSelect-select') ?? element;
                    combobox.focus({ preventScroll: true });
                    combobox.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }, 50);
            return () => clearTimeout(timer);
        }
    }, [isFirstError, formState.submitCount, name, isNonInteractive]);

    useEffect(() => {
        function handleFormError(event: Event) {
            if (isNonInteractive) return;
            const detail = (event as CustomEvent<FormErrorEventDetail>).detail;
            if (detail?.firstErrorField === name || (fieldState.error && isFirstError)) {
                setIsOpen(true);
                const element = document.querySelector<HTMLElement>(`[name="${name}"]`);
                if (element) {
                    const combobox = element.parentElement?.querySelector<HTMLElement>('[role="combobox"], .MuiSelect-select') ?? element;
                    combobox.focus({ preventScroll: true });
                    combobox.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }
        }

        if (typeof window !== 'undefined') {
            window.addEventListener(FORM_ERROR_EVENT, handleFormError);
            return () => window.removeEventListener(FORM_ERROR_EVENT, handleFormError);
        }
    }, [name, isFirstError, fieldState.error, isNonInteractive]);

    return (
        <CommonSelect
            name={name}
            {...props}
            defaultOpenErrorTooltip={props.defaultOpenErrorTooltip ?? isFirstError}
            disabled={disabled}
            error={errorProp ?? !!fieldState.error}
            helperText={
                hasHelper
                    ? (resolvedErrorMessage ?? helperTextProp)
                    : undefined
            }
            inputRef={ref}
            isFirstError={props.isFirstError ?? isFirstError}
            isRequired={props.isRequired || Boolean(rules?.required)}
            readOnly={readOnly}
            slotProps={{
                ...props.slotProps,
                select: {
                    ...props.slotProps?.select,
                    open: isNonInteractive
                        ? false
                        : isOpen,
                    onOpen: handleOpen,
                    onClose: handleClose
                },
                htmlInput: {
                    onFocus: handleFocus
                }
            }}
            value={value}
            onChange={handleChange}
        />
    );
}