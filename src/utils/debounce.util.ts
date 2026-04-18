import { TimeoutRef } from '@type/common.type';

/**
 * Runs a function after a delay, clearing any existing scheduled execution.
 *
 * @param delay - Delay in milliseconds before execution.
 * @param timerRef - Mutable ref holding the timeout ID.
 * @param onExecute - Function to execute after the delay.
 */
export function runWithDelay(
    timerRef: TimeoutRef,
    delay?: number,
    onExecute?: VoidFunction
) {
    const timeDelay = delay ?? 50;

    if (timerRef.current) {
        clearTimeout(timerRef.current);
    }

    timerRef.current = window.setTimeout(() => {
        onExecute?.();

        timerRef.current = null;
    }, timeDelay);
}