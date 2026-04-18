import { MenuItem, Select, SelectProps } from '@mui/material';
import { CaretDownIcon } from '@phosphor-icons/react';

export type PaginationSelectProps = SelectProps<number> & {
    options: number[];
}

export default function PaginationSelect({
    options,
    ...props
}: PaginationSelectProps) {
    return (
        <Select<number>
            IconComponent={CaretDownIcon}
            sx={{
                backgroundColor: 'var(--mui-tokens-color-common-white)',
                borderRadius: 'var(--mui-tokens-radius-sm)',
                fontSize: 'var(--mui-tokens-fontSize-sm)',
                height: '1.75rem',
                '.MuiSelect-select': {
                    alignItems: 'center',
                    display: 'flex',
                    padding: 'var(--mui-tokens-spacing-2)',
                    paddingRight: 'var(--mui-tokens-spacing-7)'
                },
                [`
                    .MuiOutlinedInput-notchedOutline,
                    &:hover .MuiOutlinedInput-notchedOutline
                `]: {
                    borderColor: 'var(--mui-tokens-color-neutral-300)'
                },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                    borderWidth: 'var(--mui-tokens-stroke-1)'
                },
                '.MuiSelect-icon': {
                    color: 'var(--mui-tokens-color-neutral-700)',
                    height: '0.75rem',
                    right: 'var(--mui-tokens-spacing-2)',
                    width: '0.75rem'
                }
            }}
            {...props}
        >
            {options.map((option) => (
                <MenuItem
                    key={option}
                    sx={{
                        fontSize: 'var(--mui-tokens-fontSize-sm)'
                    }}
                    value={option}
                >
                    {`${option} / page`}
                </MenuItem>
            ))}
        </Select>
    );
}