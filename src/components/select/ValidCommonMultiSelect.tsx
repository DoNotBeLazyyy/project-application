import CommonMultiSelect, { CommonMultiSelectProps } from '@components/select/CommonMultiSelect';
import {
    checkForMessage, clearFieldError, ensureSubmitValidationMode, FORM_ERROR_EVENT, FormErrorEventDetail, formatFieldLabel
} from '@utils/form.util';
import { useEffect } from 'react';
import { FieldValues, useController, UseControllerProps } from 'react-hook-form';

export type ValidCommonMultiSelectProps<T extends FieldValues = FieldValues> =
    Omit<CommonMultiSelectProps, 'value' | 'onChange'> & UseControllerProps<T> & {
        hasHelper?: boolean;
    };

export default function ValidCommonMultiSelect<T extends FieldValues = FieldValues>({
    control,
    name,
    rules,
    error: errorProp,
    hasHelper = true,
    helperText: helperTextProp,
    ...props
}: ValidCommonMultiSelectProps<T>) {
    ensureSubmitValidationMode(control);
    const {
        field: { ref, value, onChange },
        fieldState,
        formState
    } = useController({ control, name, rules });

    function handleChange(val: string[]) {
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

    const hasNoOptions = !props.options || props.options.length === 0;

    useEffect(() => {
        if (isFirstError && !props.disabled && !props.readOnly && !hasNoOptions) {
            const timer = setTimeout(() => {
                const element = document.querySelector<HTMLElement>(`[name="${name}"]`);
                if (element) {
                    const input = element.parentElement?.querySelector<HTMLInputElement>('input') ?? element;
                    input.focus();
                    input.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }, 50);
            return () => clearTimeout(timer);
        }
    }, [isFirstError, formState.submitCount, name, props.disabled, props.readOnly, hasNoOptions]);

    useEffect(() => {
        function handleFormError(event: Event) {
            if (props.disabled || props.readOnly || hasNoOptions) return;
            const detail = (event as CustomEvent<FormErrorEventDetail>).detail;
            if (detail?.firstErrorField === name || (fieldState.error && isFirstError)) {
                const element = document.querySelector<HTMLElement>(`[name="${name}"]`);
                if (element) {
                    const input = element.parentElement?.querySelector<HTMLInputElement>('input') ?? element;
                    input.focus();
                    input.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }
        }

        if (typeof window !== 'undefined') {
            window.addEventListener(FORM_ERROR_EVENT, handleFormError);
            return () => window.removeEventListener(FORM_ERROR_EVENT, handleFormError);
        }
    }, [name, isFirstError, fieldState.error, props.disabled, props.readOnly, hasNoOptions]);

    return (
        <CommonMultiSelect
            name={name}
            {...props}
            defaultOpenErrorTooltip={props.defaultOpenErrorTooltip ?? isFirstError}
            disabled={props.disabled || hasNoOptions}
            error={errorProp ?? !!fieldState.error}
            helperText={
                hasHelper
                    ? (resolvedErrorMessage ?? helperTextProp)
                    : undefined
            }
            isFirstError={props.isFirstError ?? isFirstError}
            isRequired={props.isRequired || Boolean(rules?.required)}
            ref={ref}
            value={Array.isArray(value)
                ? value
                : []}
            onChange={handleChange}
        />
    );
}