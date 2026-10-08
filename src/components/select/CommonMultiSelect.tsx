import FormLabel from '@components/form/FormLabel';
import { CommonSelectOption } from '@components/select/CommonSelect';
import Autocomplete from '@mui/material/Autocomplete';
import Chip from '@mui/material/Chip';
import TextField from '@mui/material/TextField';
import { CaretDownIcon, XIcon } from '@phosphor-icons/react';
import { classMerge } from '@utils/css.util';
import { ReactNode, SyntheticEvent, forwardRef } from 'react';

export interface CommonMultiSelectProps {
    className?: string;
    containerClassName?: string;
    labelClassName?: string;
    options: CommonSelectOption[];
    value: string[];
    label?: ReactNode;
    description?: ReactNode;
    isRequired?: boolean;
    defaultOpenErrorTooltip?: boolean;
    isFirstError?: boolean;
    name?: string;
    placeholder?: string;
    disabled?: boolean;
    readOnly?: boolean;
    error?: boolean;
    helperText?: string;
    fullWidth?: boolean;
    size?: 'small' | 'medium' | 'large';
    exclusiveValue?: string;
    onChange: (value: string[]) => void;
}

const CommonMultiSelect = forwardRef<HTMLDivElement, CommonMultiSelectProps>(({
    className,
    containerClassName,
    defaultOpenErrorTooltip,
    description,
    disabled,
    error,
    exclusiveValue,
    fullWidth = true,
    helperText,
    isFirstError,
    isRequired,
    label,
    labelClassName,
    options,
    placeholder,
    readOnly,
    size = 'large',
    value,
    onChange
}, ref) => {
    const selectedOptions = options.filter((option) =>
        value.includes(String(option.value)));

    function handleChange(_event: SyntheticEvent, newValue: CommonSelectOption[]) {
        if (readOnly) {
            return;
        }

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

    const isNonInteractive = Boolean(disabled || readOnly);
    const labelErrorMessage = label && error ? helperText : undefined;
    const labelDescription = description ?? (label && !error ? helperText : undefined);

    return (
        <div
            className={
                classMerge(
                    'flex flex-col gap-(--mui-tokens-spacing-2) relative',
                    fullWidth && 'w-full',
                    containerClassName
                )
            }
        >
            {label && (
                <FormLabel
                    className={classMerge('tw_body_small_bold', labelClassName)}
                    defaultOpenErrorTooltip={defaultOpenErrorTooltip || isFirstError}
                    description={labelDescription}
                    errorMessage={labelErrorMessage}
                    isRequired={isRequired}
                    label={label}
                />
            )}
            <Autocomplete
                className={classMerge(
                    fullWidth && 'w-full',
                    className
                )}
                disableCloseOnSelect
                disabled={disabled}
                fullWidth={fullWidth}
                getOptionLabel={(option) => option.label}
                isOptionEqualToValue={(option, val) => option.value === val.value}
                multiple
                options={options}
                popupIcon={<CaretDownIcon size={16} weight="bold" />}
                readOnly={readOnly}
                ref={ref}
                renderInput={(params) => (
                    <TextField
                        {...params}
                        className={className}
                        error={error}
                        helperText={label ? undefined : helperText}
                        label=""
                        placeholder={selectedOptions.length === 0
                            ? placeholder
                            : undefined}
                        size={size}
                        slotProps={{
                            input: {
                                ...params.InputProps,
                                readOnly
                            }
                        }}
                        variant="outlined"
                    />
                )}
                renderTags={(tagValue, getTagProps) =>
                    tagValue.map((option, index) => {
                        const { key, ...tagProps } = getTagProps({ index });

                        return (
                            <Chip
                                deleteIcon={
                                    isNonInteractive
                                        ? undefined
                                        : (
                                            <XIcon
                                                size={12}
                                                weight="bold"
                                            />
                                        )
                                }
                                key={key}
                                label={option.label}
                                size="small"
                                variant="outlined"
                                {...tagProps}
                                sx={{
                                    backgroundColor: isNonInteractive
                                        ? 'var(--mui-tokens-color-common-white)'
                                        : 'var(--mui-tokens-color-brand-50)',
                                    borderColor: isNonInteractive
                                        ? 'var(--mui-tokens-color-brand-500)'
                                        : 'var(--mui-tokens-color-brand-600)',
                                    borderStyle: 'solid',
                                    borderWidth: '1px',
                                    color: 'var(--mui-tokens-color-brand-950)',
                                    fontWeight: 500,
                                    height: '1.5rem',
                                    opacity: 1,
                                    transition: 'all 0.15s ease-in-out',
                                    '&:hover': {
                                        backgroundColor: isNonInteractive
                                            ? 'var(--mui-tokens-color-common-white)'
                                            : 'var(--mui-tokens-color-brand-100)',
                                        borderColor: 'var(--mui-tokens-color-brand-700)'
                                    },
                                    '& .MuiChip-label': {
                                        color: 'var(--mui-tokens-color-brand-950)',
                                        fontSize: 'var(--mui-tokens-fontSize-xs)',
                                        fontWeight: 500,
                                        opacity: 1,
                                        paddingLeft: 'var(--mui-tokens-spacing-2)',
                                        paddingRight: isNonInteractive
                                            ? 'var(--mui-tokens-spacing-2)'
                                            : 'var(--mui-tokens-spacing-1)',
                                        WebkitTextFillColor: 'var(--mui-tokens-color-brand-950)'
                                    },
                                    '& .MuiChip-deleteIcon': {
                                        color: 'var(--mui-tokens-color-brand-700)',
                                        cursor: isNonInteractive
                                            ? 'default'
                                            : 'pointer',
                                        fontSize: '0.75rem',
                                        marginLeft: 'var(--mui-tokens-spacing-2)',
                                        marginRight: '2px',
                                        opacity: isNonInteractive
                                            ? 0.4
                                            : 1,
                                        pointerEvents: isNonInteractive
                                            ? 'none'
                                            : 'auto',
                                        transition: 'color 0.15s ease',
                                        '&:hover': {
                                            color: 'var(--mui-tokens-color-brand-950)'
                                        }
                                    },
                                    '&.Mui-disabled': {
                                        backgroundColor: 'var(--mui-tokens-color-common-white) !important',
                                        borderColor: 'var(--mui-tokens-color-brand-500) !important',
                                        color: 'var(--mui-tokens-color-brand-950) !important',
                                        opacity: '1 !important',
                                        '& .MuiChip-label': {
                                            color: 'var(--mui-tokens-color-brand-950) !important',
                                            opacity: '1 !important',
                                            WebkitTextFillColor: 'var(--mui-tokens-color-brand-950) !important'
                                        },
                                        '& .MuiChip-deleteIcon': {
                                            color: 'var(--mui-tokens-color-brand-600) !important',
                                            opacity: '0.4 !important',
                                            pointerEvents: 'none'
                                        }
                                    }
                                }}
                            />
                        );
                    })
                }
                value={selectedOptions}
                onChange={handleChange}
            />
        </div>
    );
});
CommonMultiSelect.displayName = 'CommonMultiSelect';

export default CommonMultiSelect;