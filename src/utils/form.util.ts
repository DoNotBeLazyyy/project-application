import { FieldErrors, FieldValues, Path, UseFormReturn } from 'react-hook-form';

interface ErrorMessageProps<T> {
    key: Path<T>;
    message?: string;
}

interface ErrorCheckResult<T> {
    count: number;
    firstError: ErrorMessageProps<T> | null;
    list: ErrorMessageProps<T>[];
}

export function formatFieldLabel(key: string): string {
    const segments = key.split('.')
        .filter(function(segment) {
            return segment !== '' && !/^\d+$/.test(segment);
        });
    const leaf = segments[segments.length - 1] ?? key;

    return leaf
        .replace(/_/g, ' ')
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, function(str) {
            return str.toUpperCase();
        })
        .trim();
}

export const FORM_ERROR_EVENT = 'app:form-error';

export interface FormErrorEventDetail {
    count: number;
    message: string;
}

function scrollFieldIntoView(name: string): void {
    if (typeof document === 'undefined') {
        return;
    }

    const field = document.querySelector(`[name="${name}"]`);

    if (field instanceof HTMLElement) {
        field.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

function announceFormError(detail: FormErrorEventDetail): void {
    if (typeof window === 'undefined' || typeof window.CustomEvent !== 'function') {
        return;
    }

    window.dispatchEvent(new CustomEvent<FormErrorEventDetail>(FORM_ERROR_EVENT, { detail }));
}

export function formErrors<T extends FieldValues>(
    errors: FieldErrors<T>,
    methods: UseFormReturn<T>
): void {
    const error = checkForMessage<T>(errors);
    if (error.firstError) {
        const { firstError } = error;

        methods.setFocus(firstError.key);
        scrollFieldIntoView(firstError.key);
        announceFormError({
            count: error.count,
            message: firstError.message ?? 'Please complete the required fields before saving.'
        });
    }
}

export function checkForMessage<T extends FieldValues>(
    errors: FieldErrors,
    path = ''
): ErrorCheckResult<T> {
    let count = 0;
    let firstError: ErrorMessageProps<T> | null = null;
    const list: ErrorMessageProps<T>[] = [];

    function walk(err: FieldErrors, currentPath = ''): void {
        if (Array.isArray(err)) {
            for (let i = 0; i < err.length; i++) {
                const pathPrefix = currentPath
                    ? '.'
                    : '';
                walk(err[i], `${currentPath}${pathPrefix}${i}`);
            }
        }
        else if (err && typeof err === 'object') {
            for (const key in err) {
                if (Object.prototype.hasOwnProperty.call(err, key)) {
                    if (key === 'ref') {
                        continue;
                    }
                    const newPath = currentPath
                        ? `${currentPath}.${key}`
                        : key;
                    const value = err[key];

                    if (value && typeof value === 'object' && 'message' in value) {
                        const entry: ErrorMessageProps<T> = {
                            key: newPath as Path<T>,
                            message: value.message as string
                        };

                        count++;
                        list.push(entry);
                        if (!firstError) {
                            firstError = entry;
                        }
                    }
                    walk(value as FieldErrors, newPath);
                }
            }
        }
    }

    walk(errors, path);
    return { firstError, count, list };
}