import FormLabel from '@components/form/FormLabel';
import MenuItem from '@mui/material/MenuItem';
import TextField, { TextFieldProps } from '@mui/material/TextField';
import { CaretDownIcon } from '@phosphor-icons/react';
import { StringNum } from '@type/common.type';
import { classMerge } from '@utils/css.util';
import { forwardRef, ReactNode } from 'react';

export type SharedStringSizeProps = 'pagination' | 'xsmall' | 'small' | 'medium' | 'large';
export interface CommonSelectOption {
    // Option label
    label: string;

    // Option value
    value: StringNum;
}

export interface CommonSelectProps extends Omit<TextFieldProps, 'select' | 'children'> {
    // Select options
    options: CommonSelectOption[];

    // Whether the select field is read-only
    readOnly?: boolean;

    containerClassName?: string;
    labelClassName?: string;
    isRequired?: boolean;
    defaultOpenErrorTooltip?: boolean;
    isFirstError?: boolean;
    description?: ReactNode;
}

/**
 * CommonSelect
 *
 * A reusable select component built on top of MUI TextField using the select mode.
 * Supports custom theme size and variant props while keeping the native TextField API.
 *
 * The select size is forwarded only to the menu container. Menu item sizing is resolved
 * dynamically by the MuiMenu theme variant so individual MenuItem size props are not needed.
 *
 * @example
 * <CommonSelect
 *     fullWidth
 *     label="Status"
 *     options={[
 *         { label: 'Active', value: 'ACTIVE' },
 *         { label: 'Inactive', value: 'INACTIVE' }
 *     ]}
 *     size="large"
 *     value={value}
 *     variant="outlined"
 *     onChange={handleChange}
 * />
 */
const CommonSelect = forwardRef<HTMLDivElement, CommonSelectProps>(({
    className,
    containerClassName,
    defaultOpenErrorTooltip,
    description,
    disabled,
    error,
    fullWidth,
    helperText,
    isFirstError,
    isRequired,
    label,
    labelClassName,
    options,
    readOnly,
    size = 'large',
    slotProps,
    variant = 'outlined',
    ...props
}, ref) => {
    const isNonInteractive = Boolean(disabled || readOnly);
    const labelErrorMessage = label && error
        ? helperText
        : undefined;
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
            <TextField
                className={className}
                disabled={disabled}
                error={error}
                fullWidth={fullWidth}
                helperText={label ? undefined : helperText}
                label=""
                ref={ref}
                select
                size={size}
                variant={variant}
                {...props}
                slotProps={{
                    ...slotProps,
                    input: {
                        ...slotProps?.input,
                        readOnly
                    },
                    select: {
                        displayEmpty: true,
                        ...slotProps?.select,
                        readOnly,
                        IconComponent: (iconProps) => (
                            <CaretDownIcon
                                {...iconProps}
                                weight="bold"
                            />
                        )
                    }
                }}
            >
                {options.map(({ label: optLabel, value }) => (
                    <MenuItem
                        key={value}
                        value={value}
                    >
                        {optLabel}
                    </MenuItem>
                ))}
            </TextField>
        </div>
    );
});
CommonSelect.displayName = 'CommonSelect';

export default CommonSelect;