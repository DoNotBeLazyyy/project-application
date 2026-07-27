import Checkbox, { CheckboxProps } from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import { FieldValues, useController, UseControllerProps } from 'react-hook-form';

export type ValidCommonCheckboxProps<T extends FieldValues = FieldValues> =
    Omit<CheckboxProps, 'defaultValue'> & UseControllerProps<T> & {
        hasHelper?: boolean;
        helperText?: string;
        label?: string;
    };

export default function ValidCommonCheckbox<T extends FieldValues = FieldValues>({
    control,
    name,
    rules,
    disabled,
    hasHelper = true,
    helperText,
    label,
    ...props
}: ValidCommonCheckboxProps<T>) {
    const { field: { value, onChange, ref }, fieldState } = useController({ control, name, rules });
    const helperMessage = fieldState.error?.message ?? helperText;

    return (
        <div className="flex flex-col">
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