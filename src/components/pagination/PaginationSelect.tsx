import { MenuItem, Select, SelectProps } from '@mui/material';
import { CaretDownIcon } from '@phosphor-icons/react';
import { useTranslation } from 'react-i18next';

export type PaginationSelectProps = SelectProps<number> & {
    // Available numerical options for the select dropdown
    options: number[];
}

/**
 * PaginationSelect
 *
 * A customized MUI Select component designed for pagination rows-per-page selection.
 *
 * @example
 * <PaginationSelect
 *  options={[10, 25, 50, 100]}
 *  value={10}
 *  onChange={handleChange}
 * />
 */
export default function PaginationSelect({
    options,
    ...props
}: PaginationSelectProps) {
    const { t } = useTranslation(); // Translation hook

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
                `]: { borderColor: 'var(--mui-tokens-color-neutral-300)' },
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
                    sx={{ fontSize: 'var(--mui-tokens-fontSize-sm)' }}
                    value={option}
                >
                    {t('items_per_page', {
                        count: option
                    })}
                </MenuItem>
            ))}
        </Select>
    );
}