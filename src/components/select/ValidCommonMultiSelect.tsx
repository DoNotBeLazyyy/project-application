import CommonMultiSelect, { CommonMultiSelectProps } from '@components/select/CommonMultiSelect';
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
    hasHelper,
    helperText: helperTextProp,
    ...props
}: ValidCommonMultiSelectProps<T>) {
    const {
        field: { ref, value, onChange },
        fieldState
    } = useController({ control, name, rules });

    return (
        <CommonMultiSelect
            {...props}
            error={errorProp ?? !!fieldState.error}
            helperText={
                hasHelper
                    ? fieldState.error?.message ?? helperTextProp
                    : undefined
            }
            ref={ref}
            value={Array.isArray(value)
                ? value
                : []}
            onChange={onChange}
        />
    );
}