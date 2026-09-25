import MenuItem from '@mui/material/MenuItem';
import TextField, { TextFieldProps } from '@mui/material/TextField';
import { CaretDownIcon } from '@phosphor-icons/react';
import { StringNum } from '@type/common.type';
import { classMerge } from '@utils/css.util';
import { forwardRef } from 'react';

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
    disabled,
    options,
    readOnly,
    size = 'large',
    slotProps,
    variant = 'outlined',
    ...props
}, ref) => {
    const isNonInteractive = Boolean(disabled || readOnly);

    return (
        <TextField
            className={classMerge(
                className,
                isNonInteractive && 'common_input_readonly'
            )}
            disabled={disabled}
            ref={ref}
            select
            size={size}
            variant={variant}
            {...props}
            label=""
            slotProps={{
                ...slotProps,
                input: {
                    ...slotProps?.input,
                    readOnly
                },
                select: {
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
            {options.map(({ label, value }) => (
                <MenuItem
                    key={value}
                    value={value}
                >
                    {label}
                </MenuItem>
            ))}
        </TextField>
    );
});
CommonSelect.displayName = 'CommonSelect';

export default CommonSelect;