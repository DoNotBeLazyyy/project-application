import CommonInput, { CommonInputProps } from '@components/input/CommonInput';
import { normalizeSx } from '@utils/theme.util';

/**
 * PaginationInput
 *
 * A controlled input component for direct page navigation.
 *
 * @example
 * <PaginationInput {...inputProps} />
 */
export default function PaginationInput({
    sx,
    value,
    variant = 'outlined',
    ...props
}: CommonInputProps) {
    const inputLength = Math.max(String(value ?? '').length, 1); // Dynamic width calculation

    return (
        <CommonInput
            sx={{
                height: '1.75rem',
                width: `max(1.75rem, calc(${inputLength}ch + 1rem))`,
                '& .MuiOutlinedInput-root': {
                    fontSize: 'var(--mui-tokens-fontSize-sm)',
                    backgroundColor: 'var(--mui-tokens-color-common-white)',
                    borderRadius: 'var(--mui-tokens-radius-sm)',
                    padding: 0,
                    [`
                        & .MuiOutlinedInput-notchedOutline,
                        &:hover .MuiOutlinedInput-notchedOutline,
                        &.Mui-focused .MuiOutlinedInput-notchedOutline
                    `]: {
                        borderColor: 'var(--mui-tokens-color-neutral-500)',
                        borderWidth: '1px'
                    }
                },
                '.MuiOutlinedInput-input': {
                    MozAppearance: 'textfield',
                    textAlign: 'center',
                    '&::-webkit-outer-spin-button, &::-webkit-inner-spin-button': {
                        WebkitAppearance: 'none',
                        margin: 0
                    }
                },
                ...normalizeSx(sx)
            }}
            {...props}
            type="number"
            value={value}
            variant={variant}
        />
    );
}