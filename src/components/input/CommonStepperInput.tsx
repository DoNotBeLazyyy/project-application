import FormLabel from '@components/form/FormLabel';
import CommonInput from '@components/input/CommonInput';
import { MinusIcon, PlusIcon } from '@phosphor-icons/react';
import { classMerge } from '@utils/css.util';
import { stripLeadingZeros } from '@utils/input.util';
import React, { forwardRef, useCallback } from 'react';

export interface CommonStepperInputProps {
    value?: number | string;
    onChange?: (value: any) => void;
    min?: number;
    max?: number;
    step?: number;
    disabled?: boolean;
    name?: string;
    label?: string;
    helperText?: React.ReactNode;
    error?: boolean;
    isRequired?: boolean;
    placeholder?: string;
    autoComplete?: string;
    clampOnInput?: boolean;
    size?: 'small' | 'medium' | 'large';
    className?: string;
    showButtons?: boolean;
}

// Step buttons are square and match the input height of each size.
const STEP_BUTTON_SIZE_CLASSES = {
    small: 'h-9 w-9',
    medium: 'h-11 w-11',
    large: 'h-12 w-12'
} as const;

const STEP_BUTTON_CLASS = 'flex items-center justify-center rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0 cursor-pointer';

const CommonStepperInput = forwardRef<HTMLDivElement, CommonStepperInputProps>(({
    value,
    onChange,
    min = 0,
    max = 100,
    step = 1,
    disabled = false,
    name,
    label,
    helperText,
    error = false,
    isRequired,
    placeholder,
    autoComplete = 'off',
    clampOnInput = false,
    size = 'large',
    className = '',
    showButtons = false
}, ref) => {
    const hasValue = value !== '' && value !== undefined && value !== null;
    const numericValue = typeof value === 'string'
        ? (value === ''
            ? 0
            : (parseFloat(value) || 0))
        : (value ?? 0);

    const handleIncrement = useCallback(() => {
        if (disabled || !onChange) return;
        const base = hasValue
            ? Number(numericValue)
            : min;
        const next = Math.min(max, Number((base + step).toFixed(2)));
        onChange(next);
    }, [disabled, max, hasValue, numericValue, onChange, step, min]);

    const handleDecrement = useCallback(() => {
        if (disabled || !onChange) return;
        const base = hasValue
            ? Number(numericValue)
            : min;
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
        }
        else {
            onChange(rawStr.endsWith('.')
                ? rawStr
                : raw);
        }
    }, [clampOnInput, max, min, onChange]);

    return (
        <div
            className={classMerge('flex flex-col gap-(--mui-tokens-spacing-2) w-full', className)}
            ref={ref}
        >
            {/*
              * Same label row as every other field: guidance and the validation
              * message hang off the label as icons. Unlabelled steppers keep the
              * message under the input instead.
              */}
            {label && (
                <FormLabel
                    description={error
                        ? undefined
                        : helperText}
                    errorMessage={error
                        ? helperText
                        : undefined}
                    isRequired={isRequired}
                    label={label}
                />
            )}
            <div className="flex items-start gap-1 w-full">
                {showButtons && (
                    <button
                        className={classMerge(STEP_BUTTON_CLASS, STEP_BUTTON_SIZE_CLASSES[size])}
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
                        helperText={label
                            ? undefined
                            : helperText}
                        name={name}
                        placeholder={placeholder}
                        size={size}
                        slotProps={{
                            htmlInput: {
                                min,
                                max,
                                step,
                                className: 'font-semibold',
                                autoComplete
                            }
                        }}
                        type="number"
                        value={hasValue
                            ? value
                            : ''}
                        onChange={handleInputChange}
                    />
                </div>
                {showButtons && (
                    <button
                        className={classMerge(STEP_BUTTON_CLASS, STEP_BUTTON_SIZE_CLASSES[size])}
                        disabled={disabled || numericValue >= max}
                        type="button"
                        onClick={handleIncrement}
                    >
                        <PlusIcon className="w-4 h-4" />
                    </button>
                )}
            </div>
        </div>
    );
});

CommonStepperInput.displayName = 'CommonStepperInput';

export default CommonStepperInput;