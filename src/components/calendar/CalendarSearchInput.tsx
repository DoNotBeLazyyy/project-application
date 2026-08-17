import { IconButton, Input, InputAdornment } from '@mui/material';
import { MagnifyingGlassIcon } from '@phosphor-icons/react';
import { ChangeEventInputElement } from '@type/common.type';

interface CalendarSearchInputProps {
    value: string;
    onChange: (event: ChangeEventInputElement) => void;
    onSearch: VoidFunction;
}

export default function CalendarSearchInput({
    value,
    onChange,
    onSearch
}: CalendarSearchInputProps) {
    return (
        <Input
            disableUnderline
            fullWidth
            placeholder="YYYY-MM"
            startAdornment={(
                <InputAdornment position="start">
                    <IconButton
                        disableRipple
                        edge="start"
                        onClick={onSearch}
                    >
                        <MagnifyingGlassIcon className="h-5 text-(--mui-tokens-color-neutral-900) w-5"/>
                    </IconButton>
                </InputAdornment>
            )}
            sx={{
                border: '1px solid #d1d5db',
                borderRadius: '999px',
                height: '36px',
                padding: '0 20px',
                '@media (pointer: coarse)': {
                    height: '44px'
                }
            }}
            value={value}
            onChange={onChange}
        />
    );
}