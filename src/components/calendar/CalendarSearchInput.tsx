import { IconButton, Input, InputAdornment } from '@mui/material';
import { MagnifyingGlassIcon } from '@phosphor-icons/react';
import { ChangeEventInputElement } from '@type/common.type';
import { useTranslation } from 'react-i18next';

interface CalendarSearchInputProps {
    // Current value of the search input
    value: string;

    // Handler triggered when the user types in the input field
    onChange: (event: ChangeEventInputElement) => void;

    // Function triggered when the user clicks the search icon or submits the input
    onSearch: VoidFunction;
}

/**
 * CalendarSearchInput
 *
 * A reusable search input component for the calendar that allows users
 * to input a date (e.g., "YYYY-MM" or "Month YYYY") and trigger a search
 * via a clickable icon button.
 *
 * @example
 * <CalendarSearchInput
 *   value={searchValue}
 *   onChange={handleInputChange}
 *   onSearch={handleSearch}
 * />
 */
export default function CalendarSearchInput({
    value,
    onChange,
    onSearch
}: CalendarSearchInputProps) {
    const { t } = useTranslation(); // Translation hook

    return (
        <Input
            disableUnderline
            fullWidth
            placeholder={t('calendar_year_month')}
            startAdornment={
                <InputAdornment position="start">
                    <IconButton
                        disableRipple
                        edge="start"
                        onClick={onSearch}
                    >
                        <MagnifyingGlassIcon className="text-[var(--mui-tokens-color-neutral-900)] h-[1.25rem] w-[1.25rem]"/>
                    </IconButton>
                </InputAdornment>
            }
            sx={{
                border: '1px solid #d1d5db',
                borderRadius: '999px',
                height: '36px',
                padding: '0 20px'
            }}
            value={value}
            onChange={onChange}
        />
    );
}