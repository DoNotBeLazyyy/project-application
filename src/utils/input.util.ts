import { ChangeEventInputTextarea } from '@type/common.type';

type ClearableElement = HTMLInputElement | HTMLTextAreaElement;

export function clearInputElement(element: ClearableElement | null | undefined) {
    if (!element) {
        return;
    }

    const prototype = element instanceof HTMLTextAreaElement
        ? HTMLTextAreaElement.prototype
        : HTMLInputElement.prototype;
    const valueSetter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;

    valueSetter?.call(element, '');
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.focus();
}

export function buildElementChangeEvent(element: ClearableElement) {
    return {
        currentTarget: element,
        target: element
    } as unknown as ChangeEventInputTextarea;
}

export function hasClearableValue(value: unknown) {
    if (value === null || value === undefined) {
        return false;
    }

    return String(value).length > 0;
}

/**
 * Strips superfluous leading zeros from numeric strings while preserving:
 * - A single "0" (e.g. "0" stays "0")
 * - Valid decimals (e.g. "0.5" stays "0.5", "0." stays "0.")
 * - Negative numbers (e.g. "-0" stays "-0", "-03" -> "-3")
 * - Zeros in decimal parts (e.g. "0.05" stays "0.05")
 *
 * Example transformations:
 * "03" -> "3"
 * "00" -> "0"
 * "007" -> "7"
 * "-03" -> "-3"
 * "0.5" -> "0.5"
 * "10" -> "10"
 */
export function stripLeadingZeros(val: string | number | null | undefined): string {
    if (val === null || val === undefined) {
        return '';
    }
    const str = String(val);
    if (!str) {
        return str;
    }

    const isNegative = str.startsWith('-');
    const unsigned = isNegative ? str.slice(1) : str;

    const parts = unsigned.split('.');

    // Strip leading zeros that are immediately followed by another digit in the integer part
    parts[0] = parts[0].replace(/^0+(?=\d)/, '');

    const result = parts.join('.');
    return isNegative ? `-${result}` : result;
}