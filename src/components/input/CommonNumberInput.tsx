import CommonInput, { CommonInputProps } from '@components/input/CommonInput';
import { InputAdornment } from '@mui/material';
import { forwardRef, useCallback, useState } from 'react';

export type CommonNumberInputProps = Omit<CommonInputProps, 'onChange' | 'value'> & {
    value?: number | string;
    onChange?: (value: number | undefined) => void;
    min?: number;
    max?: number;
    allowNegative?: boolean;
    maxDigits?: number;
    minDecimals?: number;
    maxDecimals?: number;
    step?: number;
    prefixText?: string;
    suffixText?: string;
    selectAllOnFocus?: boolean;
};

const CommonNumberInput = forwardRef<HTMLDivElement, CommonNumberInputProps>(({
    allowNegative,
    maxDecimals = 2,
    maxDigits,
    minDecimals = 0,
    min,
    max,
    step = 0,
    value,
    onChange,
    prefixText,
    suffixText,
    selectAllOnFocus = false,
    ...props
}, ref) => {
    const [isFocused, setIsFocused] = useState(false);
    const [draft, setDraft] = useState<string | null>(null);

    const numericValue = typeof value === 'string'
        ? parseFloat(value.replace(/,/g, ''))
        : value ?? undefined;

    function formatDisplayValue(val: number | string | undefined) {
        if (val === undefined || val === null || val === '') return '';
        const num = typeof val === 'string'
            ? parseFloat(val.replace(/,/g, ''))
            : val;
        if (isNaN(num)) return '';

        return num.toLocaleString('en-US', {
            // While typing, we don't force trailing zeros (minDecimals)
            // This allows the user to type ".0" without it jumping to ".00"
            minimumFractionDigits: isFocused
                ? 0
                : minDecimals,
            maximumFractionDigits: maxDecimals
        });
    }

    const handleStep = useCallback(function(direction: 'up' | 'down') {
        if (!onChange || step <= 0) return;

        const adjustment = direction === 'up'
            ? step
            : -step;
        let newValue = (numericValue || 0) + adjustment;

        // Boundary Checks
        if (min !== undefined && newValue < min) newValue = min;
        if (max !== undefined && newValue > max) newValue = max;
        if (!allowNegative && newValue < 0) return;

        // Max Digits Check
        if (maxDigits && Math.floor(Math.abs(newValue))
            .toString().length > maxDigits) return;

        onChange(Number(newValue.toFixed(maxDecimals)));
    }, [numericValue, onChange, step, allowNegative, maxDigits, maxDecimals, min, max]);

    function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
        if (e.key === 'ArrowUp') {
            e.preventDefault();
            handleStep('up');
        }
        else if (e.key === 'ArrowDown') {
            e.preventDefault();
            handleStep('down');
        }
    }

    const handleChange = useCallback(function(e: React.ChangeEvent<HTMLInputElement>) {
        let rawValue = e.target.value.replace(/,/g, '');

        // Character Filtering
        rawValue = allowNegative
            ? rawValue.replace(/[^-0-9.]/g, '')
            : rawValue.replace(/[^0-9.]/g, '');

        const parts = rawValue.split('.');
        if (parts.length > 2) return;
        if (maxDigits && parts[0].replace('-', '').length > maxDigits) return;
        if (parts[1] && parts[1].length > maxDecimals) return;

        setDraft(rawValue);

        if (onChange) {
            if (rawValue === '' || rawValue === '-' || rawValue === '.') {
                onChange(undefined);
                return;
            }
            let numericParsed = parseFloat(rawValue);

            if (!isNaN(numericParsed) && max !== undefined && numericParsed > max) {
                numericParsed = max;
                setDraft(String(max));
            }

            onChange(numericParsed);
        }
    }, [allowNegative, maxDigits, maxDecimals, onChange, max]);

    function handleBlur(e: React.FocusEvent<HTMLInputElement>) {
        setIsFocused(false);
        setDraft(null);
        props.onBlur?.(e);
    }

    function handleFocus(e: React.FocusEvent<HTMLInputElement>) {
        setIsFocused(true);
        if (selectAllOnFocus) e.target.select();
        props.onFocus?.(e);
    }

    return (
        <CommonInput
            {...props}
            ref={ref}
            slotProps={{
                ...props.slotProps,
                htmlInput: {
                    inputMode: 'decimal',
                    autoComplete: 'off',
                    ...props.slotProps?.htmlInput
                },
                input: {
                    startAdornment: prefixText && (
                        <InputAdornment position="start">{prefixText}</InputAdornment>
                    ),
                    endAdornment: suffixText && (
                        <InputAdornment position="end">{suffixText}</InputAdornment>
                    ),
                    ...props.slotProps?.input
                }
            }}
            value={draft !== null
                ? draft
                : formatDisplayValue(value)}
            onBlur={handleBlur}
            onChange={handleChange}
            onFocus={handleFocus}
            onKeyDown={handleKeyDown}
        />
    );
});
CommonNumberInput.displayName = 'CommonNumberInput';

export default CommonNumberInput;