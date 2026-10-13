import CommonTextarea, { CommonTextareaProps } from '@components/textarea/CommonTextarea';
import { ChangeEventInputTextarea, MakeOptional } from '@type/common.type';
import {
    checkForMessage, clearFieldError, ensureSubmitValidationMode, FORM_ERROR_EVENT, FormErrorEventDetail, formatFieldLabel
} from '@utils/form.util';
import { useEffect } from 'react';
import { FieldValues, useController, UseControllerProps } from 'react-hook-form';

export type ValidCommonTextareaProps<T extends FieldValues = FieldValues> = MakeOptional<CommonTextareaProps, 'value'> & UseControllerProps<T> & {
    hasHelper?: boolean;
};

/**
 * ValidCommonTextarea
 * A custom wrapper component for CommonTextarea integrated with react-hook-form.
 * Binds textarea field to form state using useController.
 *
 * Example:
 * <ValidCommonTextarea
 *   control={control}
 *   label="Description"
 *   name="description"
 *   placeholder="Enter details"
 * />
 */
export default function ValidCommonTextarea<T extends FieldValues = FieldValues>({
    control,
    name,
    rules,
    error: errorProp,
    hasHelper = true,
    helperText: helperTextProp,
    onChangeText: onDefaultChange,
    ...props
}: ValidCommonTextareaProps<T>) {
    ensureSubmitValidationMode(control);
    const {
        field: { value, ref, onChange },
        fieldState,
        formState
    } = useController({ name, control, rules });

    const firstErrorKey = checkForMessage(formState.errors).firstError?.key;
    const isFirstError = Boolean(fieldState.error && firstErrorKey === name);
    const resolvedErrorMessage = fieldState.error
        ? (fieldState.error.message && fieldState.error.message.trim().length > 0
            ? fieldState.error.message
            : `${formatFieldLabel(name)} is required.`)
        : undefined;

    useEffect(() => {
        if (isFirstError && !props.disabled && !props.readOnly) {
            const timer = setTimeout(() => {
                const element = document.querySelector<HTMLTextAreaElement>(`[name="${name}"]`);
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
                const element = document.querySelector<HTMLTextAreaElement>(`[name="${name}"]`);
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

    /**
     * Change event handler for textarea input.
     * Passes the value to react-hook-form's field.onChange.
     * and also calls the optional external callback.
     */
    function handleChange(event: ChangeEventInputTextarea) {
        if (fieldState.error) {
            clearFieldError(control, name);
        }
        const newValue = event.target.value;

        onChange(newValue);
        onDefaultChange?.(newValue);
    }

    return (
        <CommonTextarea
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