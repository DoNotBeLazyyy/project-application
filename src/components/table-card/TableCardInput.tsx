import CommonInput, { CommonInputProps } from '@components/input/CommonInput';
import { InputAdornment } from '@mui/material';
import { MagnifyingGlassIcon } from '@phosphor-icons/react';
import { KeyboardEventDivElement } from '@type/common.type';

export default function TableCardInput({
    onKeyDown,
    ...props
}: CommonInputProps) {
    function handleKeyDown(event: KeyboardEventDivElement) {
        if (event.key === 'Enter') {
            event.preventDefault();
            onKeyDown?.(event);
        }
    }

    return (
        <CommonInput
            className="bg-white border-2"
            isRoundedFull
            placeholder="Search"
            size="small"
            variant="outlined"
            {...props}
            slotProps={{
                input: {
                    startAdornment: (
                        <InputAdornment position="start">
                            <MagnifyingGlassIcon
                                color="var(--mui-palette-grey-900)"
                                size={20}
                            />
                        </InputAdornment>
                    ),
                    sx: {
                        '& .MuiOutlinedInput-notchedOutline': {
                            borderColor: 'var(--mui-palette-grey-300)',
                            borderWidth: 2
                        },
                        '&:hover .MuiOutlinedInput-notchedOutline': {
                            borderWidth: 2
                        }
                    }
                }
            }}
            onKeyDown={handleKeyDown}
        />
    );
}