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
    const hasNoOptions = !options || options.length === 0;
    const resolvedOptions = options ?? [];
    const selectedOptions = hasNoOptions
        ? []
        : resolvedOptions.filter((option) =>
            value.includes(String(option.value)));

    function handleChange(_event: SyntheticEvent, newValue: CommonSelectOption[]) {
        if (readOnly || hasNoOptions) {
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

    const isSmall = size === 'small';
    const isNonInteractive = Boolean(disabled || readOnly || hasNoOptions);
    const isDisabled = Boolean(disabled || hasNoOptions);
    const labelErrorMessage = label && error
        ? helperText
        : undefined;
    const labelDescription = description ?? (label && !error
        ? helperText
        : undefined);

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
                disabled={isDisabled}
                fullWidth={fullWidth}
                getOptionLabel={(option) => option.label}
                isOptionEqualToValue={(option, val) => option.value === val.value}
                multiple
                options={resolvedOptions}
                popupIcon={<CaretDownIcon size={16} weight="bold" />}
                readOnly={readOnly}
                ref={ref}
                renderInput={(params) => (
                    <TextField
                        {...params}
                        className={className}
                        error={error}
                        helperText={label
                            ? undefined
                            : helperText}
                        label=""
                        placeholder={hasNoOptions
                            ? 'No option available'
                            : (selectedOptions.length === 0
                                ? placeholder
                                : undefined)}
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
                        const { key, onDelete, ...otherTagProps } = getTagProps({ index });
                        const chipProps = isNonInteractive
                            ? otherTagProps
                            : { ...otherTagProps, onDelete };

                        return (
                            <Chip
                                deleteIcon={
                                    isNonInteractive
                                        ? undefined
                                        : (
                                            <XIcon
                                                size={isSmall
                                                    ? 12
                                                    : 14}
                                                weight="bold"
                                            />
                                        )
                                }
                                key={key}
                                label={option.label}
                                size={isSmall
                                    ? 'small'
                                    : 'medium'}
                                title={typeof option.label === 'string'
                                    ? option.label
                                    : undefined}
                                variant="outlined"
                                {...chipProps}
                                sx={{
                                    backgroundColor: isNonInteractive
                                        ? 'var(--mui-tokens-color-neutral-100)'
                                        : 'var(--mui-tokens-color-brand-100)',
                                    borderColor: isNonInteractive
                                        ? 'var(--mui-tokens-color-neutral-300)'
                                        : 'var(--mui-tokens-color-brand-200)',
                                    borderStyle: 'solid',
                                    borderWidth: '1px',
                                    borderRadius: 'var(--mui-tokens-radius-full)',
                                    color: isNonInteractive
                                        ? 'var(--mui-tokens-color-neutral-800)'
                                        : 'var(--mui-tokens-color-brand-900)',
                                    fontWeight: 500,
                                    height: 'auto',
                                    minHeight: isSmall
                                        ? '1.5rem'
                                        : '1.75rem',
                                    maxWidth: '100%',
                                    margin: '2px',
                                    opacity: 1,
                                    padding: isNonInteractive
                                        ? '0 var(--mui-tokens-spacing-2)'
                                        : '0 var(--mui-tokens-spacing-1) 0 var(--mui-tokens-spacing-2)',
                                    transition: 'all 0.15s ease-in-out',
                                    '&:hover': {
                                        backgroundColor: isNonInteractive
                                            ? 'var(--mui-tokens-color-neutral-100)'
                                            : 'var(--mui-tokens-color-brand-200)',
                                        borderColor: isNonInteractive
                                            ? 'var(--mui-tokens-color-neutral-300)'
                                            : 'var(--mui-tokens-color-brand-300)'
                                    },
                                    '& .MuiChip-label': {
                                        boxSizing: 'border-box',
                                        color: isNonInteractive
                                            ? 'var(--mui-tokens-color-neutral-800)'
                                            : 'var(--mui-tokens-color-brand-900)',
                                        display: 'inline-block',
                                        fontSize: isSmall
                                            ? 'var(--mui-tokens-fontSize-xs)'
                                            : 'var(--mui-tokens-fontSize-sm)',
                                        fontWeight: 500,
                                        lineHeight: 1.3,
                                        maxWidth: '100%',
                                        opacity: 1,
                                        overflow: 'visible',
                                        padding: '2px 4px',
                                        textOverflow: 'clip',
                                        WebkitTextFillColor: isNonInteractive
                                            ? 'var(--mui-tokens-color-neutral-800)'
                                            : 'var(--mui-tokens-color-brand-900)',
                                        whiteSpace: 'normal',
                                        wordBreak: 'break-word'
                                    },
                                    '& .MuiChip-deleteIcon': {
                                        alignItems: 'center',
                                        borderRadius: 'var(--mui-tokens-radius-full)',
                                        color: 'var(--mui-tokens-color-brand-700)',
                                        cursor: 'pointer',
                                        display: 'inline-flex',
                                        fontSize: isSmall
                                            ? '0.75rem'
                                            : '0.875rem',
                                        justifyContent: 'center',
                                        margin: '0 2px 0 4px',
                                        opacity: 1,
                                        padding: '2px',
                                        transition: 'all 0.15s ease-in-out',
                                        '&:hover': {
                                            backgroundColor: 'var(--mui-tokens-color-brand-300)',
                                            color: 'var(--mui-tokens-color-brand-950)'
                                        }
                                    },
                                    '&.Mui-disabled': {
                                        backgroundColor: 'var(--mui-tokens-color-neutral-100) !important',
                                        borderColor: 'var(--mui-tokens-color-neutral-200) !important',
                                        color: 'var(--mui-tokens-color-neutral-500) !important',
                                        opacity: '1 !important',
                                        '& .MuiChip-label': {
                                            color: 'var(--mui-tokens-color-neutral-500) !important',
                                            opacity: '1 !important',
                                            WebkitTextFillColor: 'var(--mui-tokens-color-neutral-500) !important'
                                        },
                                        '& .MuiChip-deleteIcon': {
                                            display: 'none !important'
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