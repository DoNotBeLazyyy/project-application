import CommonNumberInput, { CommonNumberInputProps } from '@components/input/CommonNumberInput';
import { FieldValues, useController, UseControllerProps } from 'react-hook-form';

export type ValidCommonNumberInputProps<T extends FieldValues = FieldValues> =
    Omit<CommonNumberInputProps, 'value' | 'onChange'> & UseControllerProps<T> & {
        hasHelper?: boolean;
    };

export default function ValidCommonNumberInput<T extends FieldValues = FieldValues>({
    control,
    name,
    rules,
    hasHelper,
    helperText: helperTextProp,
    error: errorProp,
    ...props
}: ValidCommonNumberInputProps<T>) {
    const {
        field: { ref, value, onChange },
        fieldState
    } = useController({ control, name, rules });

    return <CommonNumberInput
        {...props}
        error={errorProp ?? !!fieldState.error}
        helperText={
            hasHelper
                ? fieldState.error?.message ?? helperTextProp
                : undefined
        }
        inputRef={ref}
        value={value}
        onChange={onChange} // This now correctly passes the number to RHF
    />;
}