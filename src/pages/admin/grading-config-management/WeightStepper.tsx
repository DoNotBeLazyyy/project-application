import { MinusIcon, PlusIcon } from '@phosphor-icons/react';
import { classMerge } from '@utils/css.util';
import { toWeight } from '@utils/period-allocation.util';

export interface WeightStepperProps {
    ariaLabel: string;
    className?: string;
    isDisabled?: boolean;
    value: string | number;
    onChange: (next: number) => void;
    onStep: (direction: number) => void;
}

/**
 * WeightStepper
 *
 * A weight cell that supports both ways people set these numbers: nudging in
 * steps when balancing against the rest of the budget, and typing a known value
 * outright. The field stays a plain number input so a value like 33 does not
 * need seven clicks to reach.
 */
export default function WeightStepper({
    ariaLabel,
    className,
    isDisabled = false,
    value,
    onChange,
    onStep
}: WeightStepperProps) {
    const buttonClass = 'cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 flex h-7 hover:bg-(--mui-tokens-color-brand-100) hover:text-(--mui-tokens-color-brand-900) items-center justify-center rounded-(--mui-tokens-radius-sm) text-(--mui-palette-text-secondary) transition-colors w-7';

    return (
        <div
            className={
                classMerge(
                    'bg-(--mui-tokens-color-neutral-100) border border-(--mui-palette-divider) flex gap-0.5 items-center p-1 rounded-(--mui-tokens-radius-md)',
                    className
                )
            }
        >
            <button
                aria-label={`Decrease ${ariaLabel}`}
                className={buttonClass}
                disabled={isDisabled}
                type="button"
                onClick={function() {
                    onStep(-1);
                }}
            >
                <MinusIcon size={14} weight="bold" />
            </button>

            <div className="flex items-baseline">
                <input
                    aria-label={ariaLabel}
                    className="bg-transparent font-bold outline-none tabular-nums text-center text-sm w-10"
                    disabled={isDisabled}
                    inputMode="numeric"
                    type="number"
                    value={toWeight(value)}
                    onChange={function(event) {
                        onChange(Number(event.target.value));
                    }}
                />
                <span className="font-bold text-(--mui-palette-text-secondary) text-xs">%</span>
            </div>

            <button
                aria-label={`Increase ${ariaLabel}`}
                className={buttonClass}
                disabled={isDisabled}
                type="button"
                onClick={function() {
                    onStep(1);
                }}
            >
                <PlusIcon size={14} weight="bold" />
            </button>
        </div>
    );
}