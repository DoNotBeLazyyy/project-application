import CommonNumberInput, { CommonNumberInputProps } from '@components/input/CommonNumberInput';
import {
    checkForMessage, clearFieldError, ensureSubmitValidationMode, FORM_ERROR_EVENT, FormErrorEventDetail, formatFieldLabel
} from '@utils/form.util';
import { useEffect, useRef } from 'react';
import { FieldValues, useController, UseControllerProps } from 'react-hook-form';

export type ValidCommonNumberInputProps<T extends FieldValues = FieldValues> =
    Omit<CommonNumberInputProps, 'value' | 'onChange'> & UseControllerProps<T> & {
        hasHelper?: boolean;
    };

export default function ValidCommonNumberInput<T extends FieldValues = FieldValues>({
    control,
    name,
    rules,
    hasHelper = true,
    helperText: helperTextProp,
    error: errorProp,
    ...props
}: ValidCommonNumberInputProps<T>) {
    ensureSubmitValidationMode(control);
    const {
        field: { ref, value, onChange },
        fieldState,
        formState
    } = useController({ control, name, rules });

    function handleChange(val: any) {
        if (fieldState.error) {
            clearFieldError(control, name);
        }
        onChange(val);
    }

    const firstErrorKey = checkForMessage(formState.errors).firstError?.key;
    const isFirstError = Boolean(fieldState.error && firstErrorKey === name);
    const resolvedErrorMessage = fieldState.error
        ? (fieldState.error.message && fieldState.error.message.trim().length > 0
            ? fieldState.error.message
            : `${formatFieldLabel(name)} is required.`)
        : undefined;

    // Take focus only right after a submit; fixing another field must not pull focus here
    const focusedSubmitCountRef = useRef(formState.submitCount);

    useEffect(() => {
        if (isFirstError && !props.disabled && !props.readOnly && formState.submitCount !== focusedSubmitCountRef.current) {
            focusedSubmitCountRef.current = formState.submitCount;
            const timer = setTimeout(() => {
                const element = document.querySelector<HTMLInputElement>(`[name="${name}"]`);
                if (element) {
                    element.focus({ preventScroll: true });
                    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }, 50);
            return () => clearTimeout(timer);
        }
    }, [isFirstError, formState.submitCount, name, props.disabled, props.readOnly]);

    useEffect(() => {
        function handleFormError(event: Event) {
            if (props.disabled || props.readOnly) return;
            const detail = (event as CustomEvent<FormErrorEventDetail>).detail;
            if (detail?.firstErrorField === name || (fieldState.error && isFirstError)) {
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
    }, [name, isFirstError, fieldState.error, props.disabled, props.readOnly]);

    return (
        <CommonNumberInput
            name={name}
            {...props}
            defaultOpenErrorTooltip={props.defaultOpenErrorTooltip ?? isFirstError}
            error={errorProp ?? !!fieldState.error}
            helperText={
                hasHelper
                    ? (resolvedErrorMessage ?? helperTextProp)
                    : undefined
            }
            inputRef={ref}
            isFirstError={props.isFirstError ?? isFirstError}
            isRequired={props.isRequired || Boolean(rules?.required)}
            value={value}
            onChange={handleChange}
        />
    );
}