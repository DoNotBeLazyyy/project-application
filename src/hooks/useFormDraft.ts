import { FormFieldConfig } from '@components/form/FormField';
import { useAppStore } from '@stores/app.store';
import { useToastStore } from '@stores/toast.store';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Control, FieldValues, useFormState, useWatch } from 'react-hook-form';

export interface UseFormDraftOptions<T extends FieldValues> {
    control: Control<T>;
    formId?: string;
    fields?: FormFieldConfig<T>[];
    storageKey?: string;
    enabled?: boolean;
    onRestore?: (restoredValues: Partial<T>) => void;
    onDiscard?: () => void;
}

export interface UseFormDraftResult {
    clearDraft: () => void;
    handleContinue: () => void;
    handleDiscard: () => void;
    hasDraft: boolean;
    isPromptOpen: boolean;
}

interface StoredDraftPayload<T> {
    pathname: string;
    timestamp: number;
    values: Partial<T>;
}

const SENSITIVE_KEY_REGEX = /password|token|secret|pin|credit_?card|cvv/i;

function isSensitiveKey(key: string): boolean {
    return SENSITIVE_KEY_REGEX.test(key);
}

function filterSensitiveFields<T extends Record<string, any>>(values: T): Partial<T> {
    if (!values || typeof values !== 'object') {
        return {};
    }

    const filtered: Record<string, any> = {};

    for (const [key, value] of Object.entries(values)) {
        if (isSensitiveKey(key)) {
            continue;
        }

        // Deep filter nested objects if any
        if (value && typeof value === 'object' && !Array.isArray(value)) {
            filtered[key] = filterSensitiveFields(value);
        } else {
            filtered[key] = value;
        }
    }

    return filtered as Partial<T>;
}

function hasMeaningfulValues(
    values: Record<string, any> | undefined | null,
    defaultValues?: Record<string, any> | undefined | null
): boolean {
    if (!values || typeof values !== 'object') {
        return false;
    }

    for (const [key, val] of Object.entries(values)) {
        if (isSensitiveKey(key)) {
            continue;
        }

        const defaultVal = defaultValues ? defaultValues[key] : undefined;

        // Check if value exists and is different from empty/default
        if (val !== undefined && val !== null && val !== '') {
            if (Array.isArray(val) && val.length === 0) {
                continue;
            }

            if (JSON.stringify(val) !== JSON.stringify(defaultVal)) {
                return true;
            }
        }
    }

    return false;
}

/**
 * useFormDraft
 *
 * Saves form input changes to `sessionStorage` in the background and prompts the
 * user upon reopening or page restart if an unsaved draft is discovered.
 */
export function useFormDraft<T extends FieldValues>({
    control,
    enabled = true,
    fields,
    formId,
    storageKey,
    onDiscard,
    onRestore
}: UseFormDraftOptions<T>): UseFormDraftResult {
    const [isPromptOpen, setIsPromptOpen] = useState(false);
    const [pendingDraft, setPendingDraft] = useState<Partial<T> | null>(null);
    const promptHandledRef = useRef(false);

    const { isDirty, isSubmitSuccessful } = useFormState({ control });
    const currentValues = useWatch({ control });

    // Derive a unique and secure storage key
    const resolvedKey = useMemo(() => {
        if (!enabled) return null;
        if (storageKey) return `au_draft_${storageKey}`;

        const pathname = typeof window !== 'undefined' ? window.location.pathname.replace(/\/+$/, '') : '';
        const fieldKey = fields
            ? fields.map((f) => String(f.name)).sort().join('_')
            : '';
        const base = formId || `${pathname}::${fieldKey || 'form'}`;
        const userId = useAppStore.getState().userProfile?.id || useAppStore.getState().session?.user?.id || 'session';

        return `au_draft_${userId}_${base}`;
    }, [enabled, formId, fields, storageKey]);

    // Reset prompt state when modal closes
    useEffect(() => {
        if (!enabled) {
            promptHandledRef.current = false;
            setIsPromptOpen(false);
        }
    }, [enabled]);

    // Check for saved draft on mount or when enabled becomes true
    useEffect(() => {
        if (!enabled || !resolvedKey || promptHandledRef.current) {
            return;
        }

        try {
            const raw = sessionStorage.getItem(resolvedKey);
            if (!raw) {
                return;
            }

            const parsed = JSON.parse(raw) as StoredDraftPayload<T>;
            const defaultVals = (control as unknown as { _defaultValues?: Record<string, any> })._defaultValues;

            if (parsed && parsed.values && hasMeaningfulValues(parsed.values, defaultVals)) {
                setPendingDraft(parsed.values);
                setIsPromptOpen(true);
            }
        } catch {
            // Ignore sessionStorage read errors
        }
    }, [enabled, resolvedKey, control]);

    // Debounced draft saving while user modifies inputs
    useEffect(() => {
        if (!enabled || !resolvedKey) {
            return;
        }

        const defaultVals = (control as unknown as { _defaultValues?: Record<string, any> })._defaultValues;
        const timer = setTimeout(() => {
            try {
                if (hasMeaningfulValues(currentValues, defaultVals)) {
                    const sanitized = filterSensitiveFields(currentValues);
                    const payload: StoredDraftPayload<T> = {
                        pathname: typeof window !== 'undefined' ? window.location.pathname : '',
                        timestamp: Date.now(),
                        values: sanitized as Partial<T>
                    };
                    sessionStorage.setItem(resolvedKey, JSON.stringify(payload));
                }
            } catch {
                // Ignore storage quota or permission errors
            }
        }, 400);

        return () => clearTimeout(timer);
    }, [currentValues, enabled, resolvedKey, control]);

    // Automatically remove draft when form is successfully submitted
    useEffect(() => {
        if (isSubmitSuccessful && resolvedKey) {
            try {
                sessionStorage.removeItem(resolvedKey);
            } catch {
                // Ignore
            }
            setPendingDraft(null);
        }
    }, [isSubmitSuccessful, resolvedKey]);

    // Warn on reload if form has unsaved modifications
    useEffect(() => {
        if (!enabled || !isDirty) {
            return;
        }

        function handleBeforeUnload(e: BeforeUnloadEvent) {
            e.preventDefault();
            e.returnValue = '';
        }

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [enabled, isDirty]);

    function clearDraft() {
        if (resolvedKey) {
            try {
                sessionStorage.removeItem(resolvedKey);
            } catch {
                // Ignore
            }
        }
        setPendingDraft(null);
        setIsPromptOpen(false);
    }

    function handleContinue() {
        promptHandledRef.current = true;
        setIsPromptOpen(false);

        if (!pendingDraft) {
            return;
        }

        // Apply restored draft values to react-hook-form
        const controlAny = control as unknown as {
            _formValues?: Record<string, any>;
            _reset?: (values: any, options?: any) => void;
        };

        if (typeof controlAny._reset === 'function') {
            controlAny._reset(
                { ...(controlAny._formValues || {}), ...pendingDraft },
                { keepDefaultValues: true }
            );
        }

        useToastStore.getState().showToast('Restored unsaved draft from earlier', 'info');
        onRestore?.(pendingDraft);
    }

    function handleDiscard() {
        promptHandledRef.current = true;
        clearDraft();
        onDiscard?.();
    }

    return {
        clearDraft,
        handleContinue,
        handleDiscard,
        hasDraft: Boolean(pendingDraft),
        isPromptOpen
    };
}

export interface UseObjectDraftOptions<T extends Record<string, any>> {
    defaultValues?: T;
    enabled?: boolean;
    formId: string;
    onDiscard?: () => void;
    onRestore: (restoredValues: Partial<T>) => void;
    values: T;
}

/**
 * useObjectDraft
 *
 * Saves arbitrary state-based form objects to `sessionStorage` and triggers
 * restoration prompt when returning. Useful for stepper modals that use React state.
 */
export function useObjectDraft<T extends Record<string, any>>({
    defaultValues,
    enabled = true,
    formId,
    onDiscard,
    onRestore,
    values
}: UseObjectDraftOptions<T>): UseFormDraftResult {
    const [isPromptOpen, setIsPromptOpen] = useState(false);
    const [pendingDraft, setPendingDraft] = useState<Partial<T> | null>(null);
    const promptHandledRef = useRef(false);

    const resolvedKey = useMemo(() => {
        if (!enabled) return null;
        const userId = useAppStore.getState().userProfile?.id || useAppStore.getState().session?.user?.id || 'session';
        return `au_draft_${userId}_${formId}`;
    }, [enabled, formId]);

    useEffect(() => {
        if (!enabled) {
            promptHandledRef.current = false;
            setIsPromptOpen(false);
        }
    }, [enabled]);

    useEffect(() => {
        if (!enabled || !resolvedKey || promptHandledRef.current) {
            return;
        }

        try {
            const raw = sessionStorage.getItem(resolvedKey);
            if (!raw) return;

            const parsed = JSON.parse(raw) as StoredDraftPayload<T>;
            if (parsed && parsed.values && hasMeaningfulValues(parsed.values, defaultValues)) {
                setPendingDraft(parsed.values);
                setIsPromptOpen(true);
            }
        } catch {
            // Ignore
        }
    }, [enabled, resolvedKey, defaultValues]);

    useEffect(() => {
        if (!enabled || !resolvedKey) {
            return;
        }

        const timer = setTimeout(() => {
            try {
                if (hasMeaningfulValues(values, defaultValues)) {
                    const sanitized = filterSensitiveFields(values);
                    const payload: StoredDraftPayload<T> = {
                        pathname: typeof window !== 'undefined' ? window.location.pathname : '',
                        timestamp: Date.now(),
                        values: sanitized as Partial<T>
                    };
                    sessionStorage.setItem(resolvedKey, JSON.stringify(payload));
                }
            } catch {
                // Ignore
            }
        }, 400);

        return () => clearTimeout(timer);
    }, [values, enabled, resolvedKey, defaultValues]);

    function clearDraft() {
        if (resolvedKey) {
            try {
                sessionStorage.removeItem(resolvedKey);
            } catch {
                // Ignore
            }
        }
        setPendingDraft(null);
        setIsPromptOpen(false);
    }

    function handleContinue() {
        promptHandledRef.current = true;
        setIsPromptOpen(false);

        if (!pendingDraft) return;

        onRestore(pendingDraft);
        useToastStore.getState().showToast('Restored unsaved draft from earlier', 'info');
    }

    function handleDiscard() {
        promptHandledRef.current = true;
        clearDraft();
        onDiscard?.();
    }

    return {
        clearDraft,
        handleContinue,
        handleDiscard,
        hasDraft: Boolean(pendingDraft),
        isPromptOpen
    };
}
