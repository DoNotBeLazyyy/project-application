import CommonInput, { CommonInputProps } from '@components/input/CommonInput';
import { InputChangeEvent } from '@type/common.type';
import { useMemo } from 'react';
import { FieldValues, useController, UseControllerProps } from 'react-hook-form';

export type ValidCommonInputProps<T extends FieldValues = FieldValues> = Omit<CommonInputProps, 'value'> & UseControllerProps<T>;

/**
 * ValidCommonInput
 * A reusable, flexible common input component that renders an input with optional label and password field.
 *
 * Example:
 * <ValidCommonInput
 *  placeholder="Enter password"
 *  type='password'
 *  value={value}
 *  onChange={handleChange}
 * />
 */
export default function ValidCommonInput<T extends FieldValues = FieldValues>({
    control,
    name,
    rules,
    type,
    onChange: onDefaultChange,
    ...props
}: ValidCommonInputProps<T>) {
    const { field: { ref, value, onChange } } = useController({ name, control, rules }); // Input form control
    const commonProps = useMemo(() => ({
        type,
        value,
        inputRef: ref,
        onChange: handleChange,
        ...props
    }), [props, type, value, handleChange, ref]); // Memoized common props

    /**
     * Input change event handler.
     *
     * @param event - Change event from the input field.
     */
    function handleChange(event: InputChangeEvent) {
        onChange(event);
        onDefaultChange?.(event);
    }

    return <CommonInput {...commonProps} />;
}