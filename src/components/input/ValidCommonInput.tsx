import CommonInput, { CommonInputProps } from '@components/input/CommonInput';
import { InputChangeEvent } from '@type/common.type';
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
    hasHelper,
    helperText: helperTextProp,
    onChange: onDefaultChange,
    ...props
}: ValidCommonInputProps<T>) {
    const { field: { ref, value, onChange }, fieldState } = useController({ control, name, rules });

    function handleChange(event: InputChangeEvent) {
        onChange(event);
        onDefaultChange?.(event);
    }

    return (
        <CommonInput
            {...props}
            error={errorProp ?? !!fieldState.error}
            helperText={
                hasHelper
                    ? helperTextProp ?? fieldState.error?.message
                    : undefined
            }
            inputRef={ref}
            type={type}
            value={value}
            onChange={handleChange}
        />
    );
}