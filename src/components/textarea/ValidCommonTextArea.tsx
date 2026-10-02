import CommonTextarea, { CommonTextareaProps } from '@components/textarea/CommonTextarea';
import { ChangeEventInputTextarea, MakeOptional } from '@type/common.type';
import { checkForMessage } from '@utils/form.util';
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
    const {
        field: { value, ref, onChange },
        fieldState,
        formState
    } = useController({ name, control, rules });

    const firstErrorKey = checkForMessage(formState.errors).firstError?.key;
    const isFirstError = Boolean(fieldState.error && firstErrorKey === name);

    /**
     * Change event handler for textarea input.
     * Passes the value to react-hook-form's field.onChange.
     * and also calls the optional external callback.
     */
    function handleChange(event: ChangeEventInputTextarea) {
        const newValue = event.target.value;

        onChange(newValue);
        onDefaultChange?.(newValue);
    }

    return (
        <CommonTextarea
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
            onChange={handleChange}
        />
    );
}