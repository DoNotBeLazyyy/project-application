import CommonMultiSelect, { CommonMultiSelectProps } from '@components/select/CommonMultiSelect';
import { checkForMessage } from '@utils/form.util';
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
    const {
        field: { ref, value, onChange },
        fieldState,
        formState
    } = useController({ control, name, rules });

    const firstErrorKey = checkForMessage(formState.errors).firstError?.key;
    const isFirstError = Boolean(fieldState.error && firstErrorKey === name);

    return (
        <CommonMultiSelect
            {...props}
            defaultOpenErrorTooltip={props.defaultOpenErrorTooltip ?? isFirstError}
            error={errorProp ?? !!fieldState.error}
            helperText={
                hasHelper
                    ? fieldState.error?.message ?? helperTextProp
                    : undefined
            }
            isFirstError={props.isFirstError ?? isFirstError}
            isRequired={props.isRequired || Boolean(rules?.required)}
            ref={ref}
            value={Array.isArray(value)
                ? value
                : []}
            onChange={onChange}
        />
    );
}