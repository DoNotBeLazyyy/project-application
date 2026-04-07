import { OutlinedInput, OutlinedInputProps } from '@mui/material';

/**
 * PaginationInput
 *
 * A controlled input component for direct page navigation.
 *
 * @example
 * <PaginationInput {...inputProps} />
 */
export default function PaginationInput({
    value,
    ...props
}: OutlinedInputProps) {
    const inputLength = Math.max(String(value ?? '').length, 1); // Dynamic width calculation

    return (
        <OutlinedInput
            sx={{
                backgroundColor: 'var(--mui-tokens-color-common-white)',
                borderRadius: 'var(--mui-tokens-radius-sm)',
                fontSize: 'var(--mui-tokens-fontSize-sm)',
                height: '1.75rem',
                width: `max(1.75rem, calc(${inputLength}ch + 1rem))`,
                '.MuiOutlinedInput-input': {
                    MozAppearance: 'textfield',
                    padding: 'var(--mui-tokens-spacing-2)',
                    textAlign: 'center',
                    '&::-webkit-outer-spin-button, &::-webkit-inner-spin-button': {
                        WebkitAppearance: 'none',
                        margin: 0
                    }
                },
                [`
                    .MuiOutlinedInput-notchedOutline,
                    &:hover .MuiOutlinedInput-notchedOutline,
                    &.Mui-focused .MuiOutlinedInput-notchedOutline,
                    &.Mui-focused:hover .MuiOutlinedInput-notchedOutline
                `]: {
                    borderColor: 'var(--mui-tokens-color-neutral-300)',
                    borderWidth: 'var(--mui-tokens-stroke-0)'
                }
            }}
            type="number"
            value={value}
            {...props}
        />
    );
}