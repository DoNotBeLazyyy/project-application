import { FieldErrors, FieldValues, Path, UseFormReturn } from 'react-hook-form';

interface ErrorMessageProps<T> {
    key: Path<T>;
    message?: string;
}

interface ErrorCheckResult<T> {
    count: number;
    firstError: ErrorMessageProps<T> | null;
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
                        count++;
                        if (!firstError) {
                            firstError = {
                                key: newPath as Path<T>,
                                message: value.message as string
                            };
                        }
                    }
                    walk(value as FieldErrors, newPath);
                }
            }
        }
    }

    walk(errors, path);
    return { firstError, count };
}