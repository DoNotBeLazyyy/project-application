import {
    Control, FieldErrors, FieldValues, Path, useForm, UseFormProps, UseFormReturn
} from 'react-hook-form';

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
    let leaf = segments[segments.length - 1] ?? key;

    // Strip trailing id/ids/code/codes suffix if it's not the entire identifier
    if (leaf.toLowerCase() !== 'id' && leaf.toLowerCase() !== 'code') {
        leaf = leaf
            .replace(/_ids$/i, 's')
            .replace(/_id$/i, '')
            .replace(/_codes$/i, 's')
            .replace(/_code$/i, '')
            .replace(/Ids$/, 's')
            .replace(/Id$/, '')
            .replace(/Codes$/, 's')
            .replace(/Code$/, '');
    }

    return leaf
        .replace(/_/g, ' ')
        .replace(/([A-Z])/g, ' $1')
        .replace(/\b\w/g, function(str) {
            return str.toUpperCase();
        })
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * Reads one field's validation message out of the error tree.
 *
 * React Hook Form nests errors to mirror the form's shape, so a dotted or
 * indexed field name (`address.city`, `rows.0.weight`) has to be walked rather
 * than looked up directly.
 *
 * @param errors - The error tree from `formState`.
 * @param name - The field's registered name.
 * @returns
 */
export function getFieldErrorMessage(errors: FieldErrors, name: string): string | undefined {
    const resolved = name.split('.')
        .reduce<unknown>(function(current, segment) {
            if (current && typeof current === 'object') {
                return (current as Record<string, unknown>)[segment];
            }

            return undefined;
        }, errors);

    if (resolved && typeof resolved === 'object') {
        const errObj = resolved as { message?: unknown; type?: unknown };
        if (typeof errObj.message === 'string' && errObj.message.trim().length > 0) {
            return errObj.message;
        }
        if (errObj.type || 'message' in errObj) {
            return `${formatFieldLabel(name)} is required.`;
        }
    }

    return undefined;
}

export const FORM_ERROR_EVENT = 'app:form-error';

export interface FormErrorEventDetail {
    count: number;
    message: string;
    firstErrorField?: string;
}

function scrollFieldIntoView(name: string): void {
    if (typeof document === 'undefined') {
        return;
    }

    const escaped = name.replace(/\./g, '\\.');
    const field = document.querySelector(`[name="${name}"], [id="${name}"], [name="${escaped}"], #${escaped}`);

    if (field instanceof HTMLElement) {
        field.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

export function announceFormError(detail: FormErrorEventDetail): void {
    if (typeof window === 'undefined' || typeof window.CustomEvent !== 'function') {
        return;
    }

    window.dispatchEvent(new CustomEvent<FormErrorEventDetail>(FORM_ERROR_EVENT, { detail }));
}

/**
 * Automatically focuses the first invalid field and opens its dropdown menu
 * or date picker popover if applicable.
 */
export function focusAndOpenFirstErrorField(
    name: string,
    methods?: { setFocus?: (name: any) => void }
): void {
    if (typeof document === 'undefined') {
        return;
    }

    if (methods && typeof methods.setFocus === 'function') {
        try {
            methods.setFocus(name);
        } catch {
            // Ignore if field is not registered in RHF
        }
    }

    setTimeout(() => {
        const escaped = name.replace(/\./g, '\\.');
        const altName = name === 'description' ? 'content' : (name === 'content' ? 'description' : undefined);
        const selector = `[name="${name}"], [id="${name}"], [data-field-name~="${name}"], [data-field-name="${name}"], [name="${escaped}"], #${escaped}` +
            (altName ? `, [name="${altName}"], [id="${altName}"], [data-field-name~="${altName}"], [data-field-name="${altName}"]` : '');
        let element = document.querySelector<HTMLElement>(selector);

        if (!element) {
            element = document.querySelector<HTMLElement>(
                `[aria-invalid="true"], .Mui-error input, .Mui-error textarea, .Mui-error [role="combobox"], .Mui-error`
            );
        }

        if (!element) return;

        const container = element.closest('.MuiFormControl-root, .flex-col, .common_input_container') || element.parentElement;

        // 1. Check if Dropdown / Select
        const combobox = container?.querySelector<HTMLElement>('[role="combobox"], .MuiSelect-select') ||
            (element.getAttribute('role') === 'combobox' ? element : null);

        if (combobox) {
            combobox.focus({ preventScroll: true });
            if (combobox.getAttribute('aria-expanded') !== 'true') {
                combobox.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
                combobox.click();
            }
        } else {
            // 2. Check if DatePicker / DateTimePicker
            const datePickerBtn = container?.querySelector<HTMLButtonElement>(
                'button[aria-label*="date" i], button[aria-label*="picker" i], button[aria-label*="calendar" i], .MuiInputAdornment-root button'
            );
            const isDatePicker = Boolean(
                datePickerBtn ||
                container?.querySelector('.MuiDatePicker-root, .MuiDateTimePicker-root')
            );

            // 3. Check for Toast UI Editor or contenteditable
            const editorEditable = container?.querySelector<HTMLElement>(
                '.toastui-editor-contents, [contenteditable="true"], .ProseMirror'
            );

            const textInput = container?.querySelector<HTMLInputElement | HTMLTextAreaElement>('input, textarea') ||
                (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement ? element : null);

            if (editorEditable) {
                editorEditable.focus({ preventScroll: true });
            } else if (textInput) {
                textInput.focus({ preventScroll: true });
            } else {
                element.focus({ preventScroll: true });
            }

            if (isDatePicker && datePickerBtn) {
                const isPopperOpen = Boolean(document.querySelector('.MuiPickersPopper-root, .MuiDateCalendar-root'));
                if (!isPopperOpen) {
                    datePickerBtn.click();
                }
            }
        }

        const scrollTarget = container || element;
        if (scrollTarget instanceof HTMLElement && typeof scrollTarget.scrollIntoView === 'function') {
            scrollTarget.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }

        announceFormError({
            count: 1,
            message: '',
            firstErrorField: name
        });
    }, 50);
}

export function formErrors<T extends FieldValues>(
    errors: FieldErrors<T>,
    methods: UseFormReturn<T>
): void {
    const error = checkForMessage<T>(errors);
    if (error.firstError) {
        const { firstError } = error;
        const detail: FormErrorEventDetail = {
            count: error.count,
            message: firstError.message ?? 'Please complete the required fields before saving.',
            firstErrorField: firstError.key
        };

        focusAndOpenFirstErrorField(firstError.key, methods);
        announceFormError(detail);
        setTimeout(() => {
            announceFormError(detail);
        }, 100);
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

                    if (value && typeof value === 'object' && ('message' in value || 'type' in value)) {
                        const rawMessage = typeof (value as { message?: unknown }).message === 'string'
                            && (value as { message: string }).message.trim().length > 0
                            ? (value as { message: string }).message
                            : `${formatFieldLabel(newPath)} is required.`;

                        const entry: ErrorMessageProps<T> = {
                            key: newPath as Path<T>,
                            message: rawMessage
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

export const DEFAULT_FORM_MODE = 'onSubmit' as const;
export const DEFAULT_FORM_REVALIDATE_MODE = 'onSubmit' as const;

export const DEFAULT_FORM_OPTIONS = {
    mode: DEFAULT_FORM_MODE,
    reValidateMode: DEFAULT_FORM_REVALIDATE_MODE
} as const;

/**
 * Ensures that the form control is configured to validate only upon submission,
 * preventing continuous validation on every keystroke after validation has failed.
 */
export function ensureSubmitValidationMode<T extends FieldValues = FieldValues>(
    control?: Control<T>
): void {
    if (!control) return;
    const c = control as unknown as {
        _options?: { mode?: string; reValidateMode?: string };
    };
    if (c._options) {
        c._options.mode = DEFAULT_FORM_MODE;
        c._options.reValidateMode = DEFAULT_FORM_REVALIDATE_MODE;
    }
}

/**
 * Clears an error for a given field from React Hook Form's control state.
 *
 * When an error field is modified (e.g. user starts typing), the field error
 * is removed and validation is deferred until the user submits the form again.
 */
export function clearFieldError<T extends FieldValues = FieldValues>(
    control: Control<T> | undefined,
    name: string
): void {
    if (!control || !name) return;

    ensureSubmitValidationMode(control);

    const c = control as unknown as {
        _clearErrors?: (name: string) => void;
        clearErrors?: (name: string) => void;
        _formState?: { errors: FieldErrors };
        _subjects?: { state: { next: (payload: unknown) => void } };
    };

    if (typeof c._clearErrors === 'function') {
        c._clearErrors(name);
        return;
    }

    if (typeof c.clearErrors === 'function') {
        c.clearErrors(name);
        return;
    }

    if (c._formState?.errors) {
        const segments = name.split('.');
        let current: Record<string, unknown> | undefined = c._formState.errors as unknown as Record<string, unknown>;
        for (let i = 0; i < segments.length - 1; i++) {
            if (!current || typeof current !== 'object') {
                break;
            }
            current = current[segments[i]] as Record<string, unknown> | undefined;
        }
        if (current && typeof current === 'object') {
            Reflect.deleteProperty(current, segments[segments.length - 1]);
        }

        if (c._subjects?.state?.next) {
            c._subjects.state.next({ name, errors: c._formState.errors });
        }
    }
}

/**
 * Standardized application form hook configured with submit-time validation.
 *
 * Ensures validation only runs upon form submission, preventing errors
 * from being evaluated on every keystroke.
 */
export function useAppForm<
    TFieldValues extends FieldValues = FieldValues,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    TContext = any,
    TTransformedValues extends FieldValues | undefined = undefined
>(
    props?: UseFormProps<TFieldValues, TContext>
): UseFormReturn<TFieldValues, TContext, TTransformedValues> {
    const methods = useForm<TFieldValues, TContext, TTransformedValues>({
        ...DEFAULT_FORM_OPTIONS,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ...(props as any)
    });

    if (methods.control) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (methods.control as any)._clearErrors = methods.clearErrors;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ensureSubmitValidationMode(methods.control as any);
    }

    const origHandleSubmit = methods.handleSubmit;
    methods.handleSubmit = ((onValid: any, onInvalid?: any) => {
        return origHandleSubmit(
            onValid,
            (errors: FieldErrors<TFieldValues>, event?: React.BaseSyntheticEvent) => {
                formErrors(errors, methods as any);
                if (typeof onInvalid === 'function') {
                    return onInvalid(errors, event);
                }
            }
        );
    }) as typeof origHandleSubmit;

    return methods;
}