import CommonNumberInput, { CommonNumberInputProps } from '@components/input/CommonNumberInput';
import { checkForMessage, clearFieldError, ensureSubmitValidationMode, formatFieldLabel } from '@utils/form.util';
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