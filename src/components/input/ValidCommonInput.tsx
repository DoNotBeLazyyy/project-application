import CommonInput, { CommonInputProps } from '@components/input/CommonInput';
import { InputChangeEvent } from '@type/common.type';
import {
    checkForMessage, clearFieldError, ensureSubmitValidationMode, FORM_ERROR_EVENT, FormErrorEventDetail, formatFieldLabel
} from '@utils/form.util';
import { useEffect, useRef } from 'react';
import { FieldValues, useController, UseControllerProps } from 'react-hook-form';

export type ValidCommonInputProps<T extends FieldValues = FieldValues> = Omit<CommonInputProps, 'value'> & UseControllerProps<T> & {
        hasHelper?: boolean;
    };

export default function ValidCommonInput<T extends FieldValues = FieldValues>({
    control,
    name,
    rules,
    type,
    error: errorProp,
    hasHelper = true,
    helperText: helperTextProp,
    onChange: onDefaultChange,
    ...props
}: ValidCommonInputProps<T>) {
    ensureSubmitValidationMode(control);
    const { field: { ref, value, onChange }, fieldState, formState } = useController({
        control, name, rules
    });

    function handleChange(event: InputChangeEvent) {
        if (fieldState.error) {
            clearFieldError(control, name);
        }
        onChange(event);
        onDefaultChange?.(event);
    }

    const firstErrorKey = checkForMessage(formState.errors).firstError?.key;
    const isFirstError = Boolean(fieldState.error && firstErrorKey === name);
    const resolvedErrorMessage = fieldState.error
        ? (fieldState.error.message && fieldState.error.message.trim().length > 0
            ? fieldState.error.message
            : `${formatFieldLabel(name)} is required.`)
        : undefined;

    // Take focus only right after a submit; fixing another field must not pull focus here
    const seenSubmitCountRef = useRef(formState.submitCount);

    useEffect(() => {
        const isNewSubmit = formState.submitCount !== seenSubmitCountRef.current;
        seenSubmitCountRef.current = formState.submitCount;

        if (isFirstError && !props.disabled && !props.readOnly && isNewSubmit) {
            const timer = setTimeout(() => {
                const element = document.querySelector<HTMLInputElement>(`[name="${name}"]`);
                if (element) {
                    element.focus({ preventScroll: true });
                    if (typeof element.scrollIntoView === 'function') {
                        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
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
                    if (typeof element.scrollIntoView === 'function') {
                        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                }
            }
        }

        if (typeof window !== 'undefined') {
            window.addEventListener(FORM_ERROR_EVENT, handleFormError);
            return () => window.removeEventListener(FORM_ERROR_EVENT, handleFormError);
        }
    }, [name, isFirstError, fieldState.error, props.disabled, props.readOnly]);

    return (
        <CommonInput
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
            name={name}
            type={type}
            value={value}
            onChange={handleChange}
        />
    );
}