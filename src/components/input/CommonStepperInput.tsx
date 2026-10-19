import CommonInput from '@components/input/CommonInput';
import { MinusIcon, PlusIcon } from '@phosphor-icons/react';
import { stripLeadingZeros } from '@utils/input.util';
import React, { forwardRef, useCallback } from 'react';

export interface CommonStepperInputProps {
    value?: number | string;
    onChange?: (value: any) => void;
    min?: number;
    max?: number;
    step?: number;
    disabled?: boolean;
    label?: string;
    helperText?: React.ReactNode;
    error?: boolean;
    placeholder?: string;
    autoComplete?: string;
    clampOnInput?: boolean;
    size?: 'small' | 'medium';
    className?: string;
    showButtons?: boolean;
}

const CommonStepperInput = forwardRef<HTMLDivElement, CommonStepperInputProps>(({
    value,
    onChange,
    min = 0,
    max = 100,
    step = 1,
    disabled = false,
    label,
    helperText,
    error = false,
    placeholder,
    autoComplete = 'off',
    clampOnInput = false,
    size = 'small',
    className = '',
    showButtons = false
}, ref) => {
    const hasValue = value !== '' && value !== undefined && value !== null;
    const numericValue = typeof value === 'string'
        ? (value === '' ? 0 : (parseFloat(value) || 0))
        : (value ?? 0);

    const handleIncrement = useCallback(() => {
        if (disabled || !onChange) return;
        const base = hasValue ? Number(numericValue) : min;
        const next = Math.min(max, Number((base + step).toFixed(2)));
        onChange(next);
    }, [disabled, max, hasValue, numericValue, onChange, step, min]);

    const handleDecrement = useCallback(() => {
        if (disabled || !onChange) return;
        const base = hasValue ? Number(numericValue) : min;
        const next = Math.max(min, Number((base - step).toFixed(2)));
        onChange(next);
    }, [disabled, min, hasValue, numericValue, onChange, step]);

    const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        if (!onChange) return;
        const rawStr = e.target.value;
        const normalized = stripLeadingZeros(rawStr);
        if (normalized === '') {
            onChange(undefined);
            return;
        }
        const raw = parseFloat(normalized);
        if (isNaN(raw)) {
            onChange(undefined);
            return;
        }
        if (clampOnInput) {
            const clamped = Math.max(min, Math.min(max, raw));
            onChange(clamped);
        } else {
            onChange(rawStr.endsWith('.') ? rawStr : raw);
        }
    }, [clampOnInput, max, min, onChange]);

    return (
        <div className={`flex flex-col gap-1 w-full ${className}`} ref={ref}>
            {label && (
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                    {label}
                </label>
            )}
            <div className="flex items-center gap-1 w-full">
                {showButtons && (
                    <button
                        className="flex items-center justify-center h-9 w-9 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0 cursor-pointer"
                        disabled={disabled || numericValue <= min}
                        type="button"
                        onClick={handleDecrement}
                    >
                        <MinusIcon className="w-4 h-4" />
                    </button>
                )}
                <div className="w-full flex-1">
                    <CommonInput
                        autoComplete={autoComplete}
                        disabled={disabled}
                        error={error}
                        fullWidth
                        placeholder={placeholder}
                        size={size}
                        type="number"
                        value={hasValue ? value : ''}
                        onChange={handleInputChange}
                        slotProps={{
                            htmlInput: {
                                min,
                                max,
                                step,
                                className: 'font-semibold',
                                autoComplete
                            }
                        }}
                    />
                </div>
                {showButtons && (
                    <button
                        className="flex items-center justify-center h-9 w-9 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0 cursor-pointer"
                        disabled={disabled || numericValue >= max}
                        type="button"
                        onClick={handleIncrement}
                    >
                        <PlusIcon className="w-4 h-4" />
                    </button>
                )}
            </div>
            {helperText && (
                <span className={`text-[11px] ${error ? 'text-red-500 dark:text-red-400 font-medium' : 'text-slate-500 dark:text-slate-400'}`}>
                    {helperText}
                </span>
            )}
        </div>
    );
});

CommonStepperInput.displayName = 'CommonStepperInput';

export default CommonStepperInput;
