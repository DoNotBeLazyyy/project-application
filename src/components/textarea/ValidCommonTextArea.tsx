import CommonTextarea, { CommonTextareaProps } from '@components/textarea/CommonTextarea';
import { ChangeEventInputTextarea, MakeOptional } from '@type/common.type';
import { FieldValues, useController, UseControllerProps } from 'react-hook-form';

export type ValidCommonTextareaProps<T extends FieldValues = FieldValues> = MakeOptional<CommonTextareaProps, 'value'> & UseControllerProps<T>;

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
    onChangeText: onDefaultChange,
    ...props
}: ValidCommonTextareaProps<T>) {
    const { field: { value, ref, onChange } } = useController({ name, control, rules }); // Text area form control

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

    return <CommonTextarea
        ref={ref}
        value={value}
        onChange={handleChange}
        {...props}
    />;
}