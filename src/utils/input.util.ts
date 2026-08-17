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

export function hasClearableValue(value: unknown) {
    if (value === null || value === undefined) {
        return false;
    }

    return String(value).length > 0;
}