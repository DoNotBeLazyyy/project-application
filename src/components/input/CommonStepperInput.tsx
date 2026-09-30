import CommonInput from '@components/input/CommonInput';
import { MinusIcon, PlusIcon } from '@phosphor-icons/react';
import React, { forwardRef, useCallback } from 'react';

export interface CommonStepperInputProps {
    value?: number | string;
    onChange?: (value: number) => void;
    min?: number;
    max?: number;
    step?: number;
    disabled?: boolean;
    label?: string;
    helperText?: string;
    size?: 'small' | 'medium';
    className?: string;
}

const CommonStepperInput = forwardRef<HTMLDivElement, CommonStepperInputProps>(({
    value = 0,
    onChange,
    min = 0,
    max = 100,
    step = 1,
    disabled = false,
    label,
    helperText,
    size = 'small',
    className = ''
}, ref) => {
    const numericValue = typeof value === 'string'
        ? (parseFloat(value) || 0)
        : (value ?? 0);

    const handleIncrement = useCallback(() => {
        if (disabled || !onChange) return;
        const next = Math.min(max, Number((numericValue + step).toFixed(2)));
        onChange(next);
    }, [disabled, max, numericValue, onChange, step]);

    const handleDecrement = useCallback(() => {
        if (disabled || !onChange) return;
        const next = Math.max(min, Number((numericValue - step).toFixed(2)));
        onChange(next);
    }, [disabled, min, numericValue, onChange, step]);

    const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        if (!onChange) return;
        const raw = parseFloat(e.target.value);
        if (isNaN(raw)) {
            onChange(min);
            return;
        }
        const clamped = Math.max(min, Math.min(max, raw));
        onChange(clamped);
    }, [max, min, onChange]);

    return (
        <div ref={ref} className={`flex flex-col gap-1 ${className}`}>
            {label && (
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                    {label}
                </label>
            )}
            <div className="flex items-center gap-1">
                <button
                    type="button"
                    disabled={disabled || numericValue <= min}
                    onClick={handleDecrement}
                    className="flex items-center justify-center h-9 w-9 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                    <MinusIcon className="w-4 h-4" />
                </button>
                <div className="w-16">
                    <CommonInput
                        disabled={disabled}
                        size={size}
                        type="number"
                        value={numericValue}
                        onChange={handleInputChange}
                        slotProps={{
                            htmlInput: {
                                min,
                                max,
                                step,
                                className: 'text-center font-semibold'
                            }
                        }}
                    />
                </div>
                <button
                    type="button"
                    disabled={disabled || numericValue >= max}
                    onClick={handleIncrement}
                    className="flex items-center justify-center h-9 w-9 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                    <PlusIcon className="w-4 h-4" />
                </button>
            </div>
            {helperText && (
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    {helperText}
                </span>
            )}
        </div>
    );
});

CommonStepperInput.displayName = 'CommonStepperInput';

export default CommonStepperInput;
