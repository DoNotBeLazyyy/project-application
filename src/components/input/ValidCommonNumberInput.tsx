import CommonNumberInput, { CommonNumberInputProps } from '@components/input/CommonNumberInput';
import { checkForMessage } from '@utils/form.util';
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
    const {
        field: { ref, value, onChange },
        fieldState,
        formState
    } = useController({ control, name, rules });

    const firstErrorKey = checkForMessage(formState.errors).firstError?.key;
    const isFirstError = Boolean(fieldState.error && firstErrorKey === name);

    return (
        <CommonNumberInput
            {...props}
            defaultOpenErrorTooltip={props.defaultOpenErrorTooltip ?? isFirstError}
            error={errorProp ?? !!fieldState.error}
            helperText={
                hasHelper
                    ? fieldState.error?.message ?? helperTextProp
                    : undefined
            }
            inputRef={ref}
            isFirstError={props.isFirstError ?? isFirstError}
            isRequired={props.isRequired || Boolean(rules?.required)}
            value={value}
            onChange={onChange} // This now correctly passes the number to RHF
        />
    );
}