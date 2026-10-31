import { FormFieldConfig } from '@components/form/FormField';
import { useAppStore } from '@stores/app.store';
import { useToastStore } from '@stores/toast.store';
import {
    createContext, useContext, useEffect, useId, useMemo, useRef, useState
} from 'react';
import { Control, FieldValues, useFormState, useWatch } from 'react-hook-form';

export interface UseFormDraftOptions<T extends FieldValues> {
    control: Control<T>;
    formId?: string;
    fields?: FormFieldConfig<T>[];
    storageKey?: string;
    enabled?: boolean;
    isAutoFormDraft?: boolean;
    onRestore?: (restoredValues: Partial<T>) => void;
    onDiscard?: VoidFunction;
}

export interface UseFormDraftResult {
    clearDraft: VoidFunction;
    handleContinue: VoidFunction;
    handleDiscard: VoidFunction;
    hasDraft: boolean;
    hasRealChanges: boolean;
    isPromptOpen: boolean;
}

export interface FormDraftModalRegistration {
    clearDraft: VoidFunction;
    hasRealChanges: boolean;
    isSubmitting?: boolean;
}

export interface FormDraftModalContextValue {
    registerDraft: (id: string, entry: FormDraftModalRegistration) => void;
    unregisterDraft: (id: string) => void;
}

export const FormDraftModalContext = createContext<FormDraftModalContextValue | null>(null);

export function useFormDraftModalContext(): FormDraftModalContextValue | null {
    return useContext(FormDraftModalContext);
}

// Track primary (explicit) useFormDraft instances per react-hook-form Control object
// so nested CommonForms sharing the same Control don't create duplicate drafts/prompts.
const activeControlDraftOwners = new WeakMap<object, string>();

// Track active draft controllers by formId so parent modals/containers can clear drafts on discard.
const activeFormIdDrafts = new Map<string, FormDraftModalRegistration>();

export function getFormDraftByFormId(formId?: string): FormDraftModalRegistration | undefined {
    if (!formId) return undefined;
    return activeFormIdDrafts.get(formId);
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

function isEmptyFormPrimitive(val: unknown): boolean {
    return val === undefined || val === null || val === '';
}

/**
 * Deeply compares two form values to determine whether they are semantically equal.
 * Treats `undefined`, `null`, and `''` as equivalent empty states, handles boolean `false`
 * vs unset, numeric strings vs numbers, arrays, Date instances, and nested plain objects.
 */
export function areFormValuesEqual(
    a: unknown,
    b: unknown,
    options?: { ignoreSensitive?: boolean }
): boolean {
    if (Object.is(a, b)) {
        return true;
    }

    if (isEmptyFormPrimitive(a) && isEmptyFormPrimitive(b)) {
        return true;
    }

    if (typeof a === 'boolean' && isEmptyFormPrimitive(b)) {
        return a === false;
    }
    if (typeof b === 'boolean' && isEmptyFormPrimitive(a)) {
        return b === false;
    }

    if (
        (typeof a === 'number' && typeof b === 'string' && b.trim() !== '')
        || (typeof b === 'number' && typeof a === 'string' && a.trim() !== '')
    ) {
        const numA = Number(a);
        const numB = Number(b);
        if (!Number.isNaN(numA) && !Number.isNaN(numB)) {
            return numA === numB;
        }
    }

    if (Array.isArray(a) && a.length === 0 && isEmptyFormPrimitive(b)) {
        return true;
    }
    if (Array.isArray(b) && b.length === 0 && isEmptyFormPrimitive(a)) {
        return true;
    }

    if (Array.isArray(a) && Array.isArray(b)) {
        if (a.length !== b.length) {
            return false;
        }
        for (let i = 0; i < a.length; i++) {
            if (!areFormValuesEqual(a[i], b[i], options)) {
                return false;
            }
        }
        return true;
    }

    if (a instanceof Date && b instanceof Date) {
        return a.getTime() === b.getTime();
    }

    if (
        typeof a === 'object'
        && a !== null
        && typeof b === 'object'
        && b !== null
        && !Array.isArray(a)
        && !Array.isArray(b)
    ) {
        const objA = a as Record<string, unknown>;
        const objB = b as Record<string, unknown>;
        const keys = new Set([...Object.keys(objA), ...Object.keys(objB)]);
        for (const key of keys) {
            if (options?.ignoreSensitive && isSensitiveKey(key)) {
                continue;
            }
            if (!areFormValuesEqual(objA[key], objB[key], options)) {
                return false;
            }
        }
        return true;
    }

    return false;
}

/**
 * Determines whether a real change literally occurred between `values` and `defaultValues`.
 * If a user edits an existing or new record and reverts it back to the way it was,
 * this returns `false`.
 */
export function hasRealFormChanges(
    values: object | undefined | null,
    defaultValues?: object | undefined | null,
    options?: { ignoreSensitive?: boolean }
): boolean {
    if (!values || typeof values !== 'object') {
        return false;
    }
    const valueRecord = values as Record<string, unknown>;
    const defaultRecord = defaultValues as Record<string, unknown> | undefined | null;

    const keys = new Set([
        ...Object.keys(values),
        ...(defaultValues && typeof defaultValues === 'object'
            ? Object.keys(defaultValues)
                .filter((k) => k in values)
            : [])
    ]);

    for (const key of keys) {
        if (options?.ignoreSensitive && isSensitiveKey(key)) {
            continue;
        }

        const val = valueRecord[key];
        const defaultVal = defaultRecord
            ? defaultRecord[key]
            : undefined;

        if (!areFormValuesEqual(val, defaultVal, options)) {
            return true;
        }
    }

    return false;
}

function filterSensitiveFields<T extends object>(values: T): Partial<T> {
    if (!values || typeof values !== 'object') {
        return {};
    }

    const filtered: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(values)) {
        if (isSensitiveKey(key)) {
            continue;
        }

        // Deep filter nested objects if any
        if (value && typeof value === 'object' && !Array.isArray(value)) {
            filtered[key] = filterSensitiveFields(value);
        }
        else {
            filtered[key] = value;
        }
    }

    return filtered as Partial<T>;
}

function hasMeaningfulValues(
    values: object | undefined | null,
    defaultValues?: object | undefined | null
): boolean {
    return hasRealFormChanges(values, defaultValues, { ignoreSensitive: true });
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
    isAutoFormDraft = false,
    storageKey,
    onDiscard,
    onRestore
}: UseFormDraftOptions<T>): UseFormDraftResult {
    const instanceId = useId();
    const modalContext = useFormDraftModalContext();
    const [isPromptOpen, setIsPromptOpen] = useState(false);
    const [pendingDraft, setPendingDraft] = useState<Partial<T> | null>(null);
    const promptHandledRef = useRef(false);
    const hasCheckedRef = useRef(false);
    const hasWrittenDraftRef = useRef(false);

    // Register explicit (non-auto) draft hook as the primary owner for this `control`
    useEffect(() => {
        if (!control || isAutoFormDraft || !enabled) {
            return;
        }
        activeControlDraftOwners.set(control as object, instanceId);
        return () => {
            if (activeControlDraftOwners.get(control as object) === instanceId) {
                activeControlDraftOwners.delete(control as object);
            }
        };
    }, [control, isAutoFormDraft, enabled, instanceId]);

    const hasParentControlOwner = Boolean(
        isAutoFormDraft
        && control
        && activeControlDraftOwners.has(control as object)
        && activeControlDraftOwners.get(control as object) !== instanceId
    );

    const effectiveEnabled = enabled && !hasParentControlOwner;

    const { isSubmitSuccessful, isSubmitting } = useFormState({ control });
    const currentValues = useWatch({ control });

    const defaultVals = (control as unknown as { _defaultValues?: Record<string, unknown> })._defaultValues;
    const liveValues = (currentValues
        ?? (control as unknown as { _formValues?: Record<string, unknown> })._formValues) as Record<string, unknown> | undefined;

    const hasRealChanges = useMemo(() => {
        return hasRealFormChanges(liveValues, defaultVals);
    }, [liveValues, defaultVals]);

    // Derive a unique and secure storage key
    const resolvedKey = useMemo(() => {
        if (!effectiveEnabled) return null;
        if (storageKey) return `au_draft_${storageKey}`;

        const pathname = typeof window !== 'undefined'
            ? window.location.pathname.replace(/\/+$/, '')
            : '';
        const fieldKey = fields
            ? fields.map((f) => String(f.name))
                .sort()
                .join('_')
            : '';
        const base = formId || `${pathname}::${fieldKey || 'form'}`;
        const userId = useAppStore.getState().userProfile?.id || useAppStore.getState().session?.user?.id || 'session';

        return `au_draft_${userId}_${base}`;
    }, [effectiveEnabled, formId, fields, storageKey]);

    // Reset prompt state when modal closes
    useEffect(() => {
        if (!effectiveEnabled) {
            promptHandledRef.current = false;
            hasCheckedRef.current = false;
            hasWrittenDraftRef.current = false;
            setIsPromptOpen(false);
        }
    }, [effectiveEnabled]);

    // Check for saved draft on mount or when enabled becomes true
    useEffect(() => {
        if (!effectiveEnabled || !resolvedKey || promptHandledRef.current || hasCheckedRef.current) {
            return;
        }

        hasCheckedRef.current = true;

        try {
            const raw = sessionStorage.getItem(resolvedKey);
            if (!raw) {
                return;
            }

            const parsed = JSON.parse(raw) as StoredDraftPayload<T>;
            const currentDefaultVals = (control as unknown as { _defaultValues?: Record<string, unknown> })._defaultValues;

            const currentFormValues = (control as unknown as { _formValues?: Record<string, unknown> })._formValues;

            // The form already shows exactly this draft (e.g. it was briefly disabled while a save
            // failed), so there is nothing to restore
            if (parsed?.values && areFormValuesEqual(parsed.values, currentFormValues, { ignoreSensitive: true })) {
                hasWrittenDraftRef.current = true;
                return;
            }

            if (parsed && parsed.values && hasMeaningfulValues(parsed.values, currentDefaultVals)) {
                setPendingDraft(parsed.values);
                setIsPromptOpen(true);
            }
            else {
                sessionStorage.removeItem(resolvedKey);
            }
        }
        catch {
            // Ignore sessionStorage read errors
        }
    }, [effectiveEnabled, resolvedKey, control]);

    // Save draft while user modifies inputs, and remove draft if user reverts back to original values
    useEffect(() => {
        if (!effectiveEnabled || !resolvedKey || !hasCheckedRef.current || isPromptOpen || pendingDraft) {
            return;
        }

        const currentDefaultVals = (control as unknown as { _defaultValues?: Record<string, unknown> })._defaultValues;
        try {
            if (hasMeaningfulValues(currentValues, currentDefaultVals)) {
                const sanitized = filterSensitiveFields(currentValues);
                const payload: StoredDraftPayload<T> = {
                    pathname: typeof window !== 'undefined'
                        ? window.location.pathname
                        : '',
                    timestamp: Date.now(),
                    values: sanitized as Partial<T>
                };
                sessionStorage.setItem(resolvedKey, JSON.stringify(payload));
                hasWrittenDraftRef.current = true;
            }
            else if (hasWrittenDraftRef.current) {
                sessionStorage.removeItem(resolvedKey);
                hasWrittenDraftRef.current = false;
            }
        }
        catch {
            // Ignore storage quota or permission errors
        }
    }, [currentValues, effectiveEnabled, resolvedKey, control, isPromptOpen, pendingDraft]);

    // Automatically remove draft when form is successfully submitted
    useEffect(() => {
        if (isSubmitSuccessful && resolvedKey) {
            try {
                sessionStorage.removeItem(resolvedKey);
            }
            catch {
                // Ignore
            }
            hasWrittenDraftRef.current = false;
            setPendingDraft(null);
        }
    }, [isSubmitSuccessful, resolvedKey]);

    // Warn on reload if form has real unsaved modifications
    useEffect(() => {
        if (!effectiveEnabled || !hasRealChanges) {
            return;
        }

        function handleBeforeUnload(e: BeforeUnloadEvent) {
            e.preventDefault();
            e.returnValue = '';
        }

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [effectiveEnabled, hasRealChanges]);

    function clearDraft() {
        if (resolvedKey) {
            try {
                sessionStorage.removeItem(resolvedKey);
            }
            catch {
                // Ignore
            }
        }
        hasWrittenDraftRef.current = false;
        setPendingDraft(null);
        setIsPromptOpen(false);
    }

    const clearDraftRef = useRef(clearDraft);
    clearDraftRef.current = clearDraft;

    // Register with enclosing modal context and formId lookup
    useEffect(() => {
        const entry: FormDraftModalRegistration = {
            clearDraft: () => clearDraftRef.current(),
            hasRealChanges,
            isSubmitting
        };

        if (modalContext) {
            modalContext.registerDraft(instanceId, entry);
        }
        if (formId) {
            activeFormIdDrafts.set(formId, entry);
        }

        return () => {
            if (modalContext) {
                modalContext.unregisterDraft(instanceId);
            }
            if (formId && activeFormIdDrafts.get(formId) === entry) {
                activeFormIdDrafts.delete(formId);
            }
        };
    }, [modalContext, instanceId, formId, hasRealChanges, isSubmitting]);

    function handleContinue() {
        promptHandledRef.current = true;
        const draftToRestore = pendingDraft;
        setPendingDraft(null);
        setIsPromptOpen(false);

        if (!draftToRestore) {
            return;
        }

        hasWrittenDraftRef.current = true;

        // Apply restored draft values to react-hook-form
        const controlAny = control as unknown as {
            _formValues?: Record<string, unknown>;
            _reset?: (values: Record<string, unknown>, options?: { keepDefaultValues?: boolean }) => void;
        };

        if (typeof controlAny._reset === 'function') {
            controlAny._reset(
                { ...(controlAny._formValues || {}), ...draftToRestore },
                { keepDefaultValues: true }
            );
        }

        useToastStore.getState()
            .showToast('Restored unsaved draft from earlier', 'info');
        onRestore?.(draftToRestore);
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
        hasRealChanges,
        isPromptOpen
    };
}

export interface UseObjectDraftOptions<T extends object> {
    defaultValues?: T;
    enabled?: boolean;
    formId: string;
    onDiscard?: VoidFunction;
    onRestore: (restoredValues: Partial<T>) => void;
    values: T;
}

/**
 * useObjectDraft
 *
 * Saves arbitrary state-based form objects to `sessionStorage` and triggers
 * restoration prompt when returning. Useful for stepper modals that use React state.
 */
export function useObjectDraft<T extends object>({
    defaultValues,
    enabled = true,
    formId,
    onDiscard,
    onRestore,
    values
}: UseObjectDraftOptions<T>): UseFormDraftResult {
    const instanceId = useId();
    const modalContext = useFormDraftModalContext();
    const [isPromptOpen, setIsPromptOpen] = useState(false);
    const [pendingDraft, setPendingDraft] = useState<Partial<T> | null>(null);
    const promptHandledRef = useRef(false);
    const hasCheckedRef = useRef(false);
    const hasWrittenDraftRef = useRef(false);

    const defaultValuesRef = useRef(defaultValues);
    defaultValuesRef.current = defaultValues;

    const valuesRef = useRef(values);
    valuesRef.current = values;

    const hasRealChanges = useMemo(() => {
        return hasRealFormChanges(values, defaultValues);
    }, [values, defaultValues]);

    const resolvedKey = useMemo(() => {
        if (!enabled) return null;
        const userId = useAppStore.getState().userProfile?.id || useAppStore.getState().session?.user?.id || 'session';
        return `au_draft_${userId}_${formId}`;
    }, [enabled, formId]);

    useEffect(() => {
        if (!enabled) {
            promptHandledRef.current = false;
            hasCheckedRef.current = false;
            hasWrittenDraftRef.current = false;
            setIsPromptOpen(false);
        }
    }, [enabled]);

    useEffect(() => {
        if (!enabled || !resolvedKey || promptHandledRef.current || hasCheckedRef.current) {
            return;
        }

        hasCheckedRef.current = true;

        try {
            const raw = sessionStorage.getItem(resolvedKey);
            if (!raw) return;

            const parsed = JSON.parse(raw) as StoredDraftPayload<T>;
            if (parsed && parsed.values && hasMeaningfulValues(parsed.values, defaultValuesRef.current)) {
                setPendingDraft(parsed.values);
                setIsPromptOpen(true);
            }
            else {
                sessionStorage.removeItem(resolvedKey);
            }
        }
        catch {
            // Ignore
        }
    }, [enabled, resolvedKey]);

    const serializedValues = useMemo(() => {
        try {
            return JSON.stringify(values);
        }
        catch {
            return '';
        }
    }, [values]);

    useEffect(() => {
        if (!enabled || !resolvedKey || !hasCheckedRef.current || isPromptOpen || pendingDraft) {
            return;
        }

        try {
            const currentVals = valuesRef.current;
            if (hasMeaningfulValues(currentVals, defaultValuesRef.current)) {
                const sanitized = filterSensitiveFields(currentVals);
                const payload: StoredDraftPayload<T> = {
                    pathname: typeof window !== 'undefined'
                        ? window.location.pathname
                        : '',
                    timestamp: Date.now(),
                    values: sanitized as Partial<T>
                };
                sessionStorage.setItem(resolvedKey, JSON.stringify(payload));
                hasWrittenDraftRef.current = true;
            }
            else if (hasWrittenDraftRef.current) {
                sessionStorage.removeItem(resolvedKey);
                hasWrittenDraftRef.current = false;
            }
        }
        catch {
            // Ignore
        }
    }, [serializedValues, enabled, resolvedKey, isPromptOpen, pendingDraft]);

    function clearDraft() {
        if (resolvedKey) {
            try {
                sessionStorage.removeItem(resolvedKey);
            }
            catch {
                // Ignore
            }
        }
        hasWrittenDraftRef.current = false;
        setPendingDraft(null);
        setIsPromptOpen(false);
    }

    const clearDraftRef = useRef(clearDraft);
    clearDraftRef.current = clearDraft;

    useEffect(() => {
        const entry: FormDraftModalRegistration = {
            clearDraft: () => clearDraftRef.current(),
            hasRealChanges
        };

        if (modalContext) {
            modalContext.registerDraft(instanceId, entry);
        }
        if (formId) {
            activeFormIdDrafts.set(formId, entry);
        }

        return () => {
            if (modalContext) {
                modalContext.unregisterDraft(instanceId);
            }
            if (formId && activeFormIdDrafts.get(formId) === entry) {
                activeFormIdDrafts.delete(formId);
            }
        };
    }, [modalContext, instanceId, formId, hasRealChanges]);

    function handleContinue() {
        promptHandledRef.current = true;
        const draftToRestore = pendingDraft;
        setPendingDraft(null);
        setIsPromptOpen(false);

        if (!draftToRestore) return;

        hasWrittenDraftRef.current = true;
        onRestore(draftToRestore);
        useToastStore.getState()
            .showToast('Restored unsaved draft from earlier', 'info');
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
        hasRealChanges,
        isPromptOpen
    };
}