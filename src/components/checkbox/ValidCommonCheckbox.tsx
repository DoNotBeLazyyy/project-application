import Checkbox, { CheckboxProps } from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import { FieldValues, useController, UseControllerProps } from 'react-hook-form';

export type ValidCommonCheckboxProps<T extends FieldValues = FieldValues> =
    Omit<CheckboxProps, 'defaultValue'> & UseControllerProps<T> & {
        label?: string;
    };

export default function ValidCommonCheckbox<T extends FieldValues = FieldValues>({
    control,
    name,
    rules,
    disabled,
    label,
    ...props
}: ValidCommonCheckboxProps<T>) {
    const { field: { value, onChange, ref } } = useController({ control, name, rules });

    return (
        <FormControlLabel
            control={
                <Checkbox
                    {...props}
                    checked={!!value}
                    disabled={disabled}
                    inputRef={ref}
                    onChange={function(e) {
                        onChange(e.target.checked);
                    }}
                />
            }
            label={label ?? ''}
        />
    );
}