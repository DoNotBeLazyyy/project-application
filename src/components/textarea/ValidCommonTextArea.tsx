import CommonTextarea, { CommonTextareaProps } from '@components/textarea/CommonTextarea';
import { ChangeEventInputTextarea, MakeOptional } from '@type/common.type';
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
    const { field: { value, ref, onChange }, fieldState } = useController({ name, control, rules }); // Text area form control
    const helperMessage = fieldState.error?.message ?? helperTextProp;

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
        <div className="flex flex-col gap-1 w-full">
            <CommonTextarea
                error={errorProp ?? !!fieldState.error}
                ref={ref}
                value={value}
                onChange={handleChange}
                {...props}
            />
            {hasHelper && helperMessage && (
                <span
                    className={
                        fieldState.error
                            ? 'text-(--mui-palette-error-main) text-xs'
                            : 'text-(--mui-palette-text-secondary) text-xs'
                    }
                >
                    {helperMessage}
                </span>
            )}
        </div>
    );
}