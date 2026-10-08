import CommonInput, { CommonInputProps } from '@components/input/CommonInput';
import { InputChangeEvent } from '@type/common.type';
import { checkForMessage } from '@utils/form.util';
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
    const { field: { ref, value, onChange }, fieldState, formState } = useController({ control, name, rules });

    function handleChange(event: InputChangeEvent) {
        onChange(event);
        onDefaultChange?.(event);
    }

    const firstErrorKey = checkForMessage(formState.errors).firstError?.key;
    const isFirstError = Boolean(fieldState.error && firstErrorKey === name);

    return (
        <CommonInput
            {...props}
            name={name}
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
            type={type}
            value={value}
            onChange={handleChange}
        />
    );
}