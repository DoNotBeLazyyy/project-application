import { CommonSelectOption } from '@components/select/CommonSelect';
import Autocomplete from '@mui/material/Autocomplete';
import Chip from '@mui/material/Chip';
import TextField from '@mui/material/TextField';
import { SyntheticEvent, forwardRef } from 'react';

export interface CommonMultiSelectProps {
    options: CommonSelectOption[];
    value: string[];
    label?: string;
    placeholder?: string;
    disabled?: boolean;
    error?: boolean;
    helperText?: string;
    fullWidth?: boolean;
    size?: 'small' | 'medium' | 'large';
    exclusiveValue?: string;
    onChange: (value: string[]) => void;
}

const CommonMultiSelect = forwardRef<HTMLDivElement, CommonMultiSelectProps>(({
    options,
    value,
    label,
    placeholder,
    disabled,
    error,
    helperText,
    fullWidth = true,
    size = 'large',
    exclusiveValue,
    onChange
}, ref) => {
    const selectedOptions = options.filter((option) =>
        value.includes(String(option.value)));

    function handleChange(_event: SyntheticEvent, newValue: CommonSelectOption[]) {
        const next = newValue.map((option) => String(option.value));

        if (!exclusiveValue) {
            onChange(next);

            return;
        }

        if (next.includes(exclusiveValue) && !value.includes(exclusiveValue)) {
            onChange([exclusiveValue]);

            return;
        }

        onChange(next.filter((item) => item !== exclusiveValue));
    }

    return (
        <Autocomplete
            disableCloseOnSelect
            disabled={disabled}
            fullWidth={fullWidth}
            getOptionLabel={(option) => option.label}
            isOptionEqualToValue={(option, val) => option.value === val.value}
            multiple
            options={options}
            ref={ref}
            renderInput={(params) => (
                <TextField
                    {...params}
                    error={error}
                    helperText={helperText}
                    label={label}
                    placeholder={selectedOptions.length === 0
                        ? placeholder
                        : undefined}
                    size={size}
                    variant="outlined"
                />
            )}
            renderValue={(tagValue, getTagProps) => (
                <div className="flex gap-2">
                    {tagValue.map((option, index) => {
                        const { key, ...tagProps } = getTagProps({ index });

                        return (
                            <Chip
                                color="secondary"
                                key={key}
                                label={option.label}
                                size="small"
                                {...tagProps}
                                className="min-w-min"
                            />
                        );
                    })}
                </div>
            )}
            value={selectedOptions}
            onChange={handleChange}
        />
    );
});
CommonMultiSelect.displayName = 'CommonMultiSelect';

export default CommonMultiSelect;