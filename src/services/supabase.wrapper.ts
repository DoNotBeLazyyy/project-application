import { supabase } from '@services/supabase.client';
import { useAppStore } from '@stores/app.store';
import { useLoadingStore } from '@stores/loading.store';
import { useToastStore } from '@stores/toast.store';
import { FunctionsHttpError, SupabaseClient } from '@supabase/supabase-js';
import { ServiceErrorProps, ServiceResult } from '@type/service.type';
import { parseServiceError } from '@utils/error.util';

interface RawResponse {
    data: unknown;
    error: unknown;
    status?: number;
}

type QueryBuilderFn = (client: SupabaseClient) => PromiseLike<RawResponse>;

function isPostgresRpcError(error: unknown): boolean {
    return (
        typeof error === 'object'
        && error !== null
        && 'code' in error
        && typeof (error as { code?: unknown })['code'] === 'string'
        && /^[0-9A-Z]{5}$/.test((error as { code: string })['code'])
    );
}

function shouldRedirectToLogin(status: number | undefined, error: unknown): boolean {
    if (status !== 401 && status !== 403) {
        return false;
    }

    return !isPostgresRpcError(error);
}

function handleAuthFailure(): void {
    useAppStore.getState()
        .clearSession();
    window.location.href = '/login';
}

function isRpcFailurePayload(data: unknown): data is { success: false; message: string } {
    return (
        typeof data === 'object'
        && data !== null
        && 'success' in data
        && (data as Record<string, unknown>)['success'] === false
        && typeof (data as Record<string, unknown>)['message'] === 'string'
    );
}

function isRpcSuccessPayload(data: unknown): data is { success: true; message: string } {
    return (
        typeof data === 'object'
        && data !== null
        && 'success' in data
        && (data as Record<string, unknown>)['success'] === true
        && typeof (data as Record<string, unknown>)['message'] === 'string'
    );
}

function notify(message: string, variant: 'error' | 'success'): void {
    try {
        useToastStore.getState()
            .showToast(message, variant);
    }
    catch {
        return;
    }
}

interface CallRpcOptions {
    background?: boolean;
    silent?: boolean;
}

function isBackgroundCall(options?: CallRpcOptions): boolean {
    return options?.background === true || options?.silent === true;
}

function isSilentCall(options?: CallRpcOptions): boolean {
    return options?.silent === true;
}

export async function callRpc<T>(
    fn: string,
    params?: Record<string, unknown>,
    options?: CallRpcOptions
): Promise<ServiceResult<T>> {
    const isSilent = isSilentCall(options);
    const isBackground = isBackgroundCall(options);

    if (!isBackground) {
        useLoadingStore.getState()
            .show();
    }
    try {
        const { data, error, status } = await supabase.rpc(fn, params);

        if (error) {
            if (shouldRedirectToLogin(status, error)) {
                handleAuthFailure();
            }
            const parsed = parseServiceError(error);
            if (!isSilent) {
                notify(parsed.message, 'error');
            }
            return { data: null, error: parsed };
        }

        if (isRpcFailurePayload(data)) {
            if (!isSilent) {
                notify(data.message, 'error');
            }
            return {
                data: null,
                error: { code: null, message: data.message, status: null }
            };
        }

        if (isRpcSuccessPayload(data) && !isSilent) {
            notify(data.message, 'success');
        }

        return { data: data as T, error: null };
    }
    catch (err) {
        const parsed = parseServiceError(err);
        if (!isSilent) {
            notify(parsed.message, 'error');
        }
        return { data: null, error: parsed };
    }
    finally {
        if (!isBackground) {
            useLoadingStore.getState()
                .hide();
        }
    }
}

export async function callQuery<T>(
    queryFn: QueryBuilderFn,
    options?: CallRpcOptions
): Promise<ServiceResult<T[]>> {
    const isSilent = isSilentCall(options);
    const isBackground = isBackgroundCall(options);

    if (!isBackground) {
        useLoadingStore.getState()
            .show();
    }
    try {
        const { data, error, status } = await queryFn(supabase);
        if (error) {
            if (shouldRedirectToLogin(status, error)) {
                handleAuthFailure();
            }
            const parsed = parseServiceError(error);
            if (!isSilent) {
                notify(parsed.message, 'error');
            }
            return { data: null, error: parsed };
        }
        return { data: data as T[], error: null };
    }
    catch (err) {
        const parsed = parseServiceError(err);
        if (!isSilent) {
            notify(parsed.message, 'error');
        }
        return { data: null, error: parsed };
    }
    finally {
        if (!isBackground) {
            useLoadingStore.getState()
                .hide();
        }
    }
}

export async function callStorage<T>(
    operation: () => Promise<ServiceResult<T>>,
    options?: CallRpcOptions
): Promise<ServiceResult<T>> {
    const isSilent = isSilentCall(options);
    const isBackground = isBackgroundCall(options);

    if (!isBackground) {
        useLoadingStore.getState()
            .show();
    }
    try {
        const result = await operation();

        if (result.error) {
            if (shouldRedirectToLogin(result.error.status ?? undefined, result.error)) {
                handleAuthFailure();
            }
            if (!isSilent) {
                notify(result.error.message, 'error');
            }
        }

        return result;
    }
    catch (err) {
        const parsed = parseServiceError(err);
        if (!isSilent) {
            notify(parsed.message, 'error');
        }
        return { data: null, error: parsed };
    }
    finally {
        if (!isBackground) {
            useLoadingStore.getState()
                .hide();
        }
    }
}

async function parseFunctionError(error: unknown): Promise<ServiceErrorProps> {
    if (!(error instanceof FunctionsHttpError)) {
        return parseServiceError(error);
    }

    const response = error.context as Response;
    const status = typeof response?.status === 'number'
        ? response.status
        : null;

    try {
        const payload = await response.json() as { message?: string };
        return {
            message: typeof payload?.message === 'string'
                ? payload.message
                : 'The service is unavailable right now.',
            code: null,
            status
        };
    }
    catch {
        return { message: 'The service is unavailable right now.', code: null, status };
    }
}

export async function callFunction<T>(
    name: string,
    body?: Record<string, unknown>,
    options?: CallRpcOptions
): Promise<ServiceResult<T>> {
    const isSilent = isSilentCall(options);
    const isBackground = isBackgroundCall(options);

    if (!isBackground) {
        useLoadingStore.getState()
            .show();
    }
    try {
        const { data, error } = await supabase.functions.invoke<T>(name, { body });

        if (error) {
            const parsed = await parseFunctionError(error);
            if (shouldRedirectToLogin(parsed.status ?? undefined, parsed)) {
                handleAuthFailure();
            }
            if (!isSilent) {
                notify(parsed.message, 'error');
            }
            return { data: null, error: parsed };
        }

        if (isRpcFailurePayload(data)) {
            if (!isSilent) {
                notify(data.message, 'error');
            }
            return {
                data: null,
                error: { code: null, message: data.message, status: null }
            };
        }

        if (isRpcSuccessPayload(data) && !isSilent) {
            notify(data.message, 'success');
        }

        return { data: data as T, error: null };
    }
    catch (err) {
        const parsed = parseServiceError(err);
        if (!isSilent) {
            notify(parsed.message, 'error');
        }
        return { data: null, error: parsed };
    }
    finally {
        if (!isBackground) {
            useLoadingStore.getState()
                .hide();
        }
    }
}

export async function callSingle<T>(
    queryFn: QueryBuilderFn,
    options?: CallRpcOptions
): Promise<ServiceResult<T>> {
    const isSilent = isSilentCall(options);
    const isBackground = isBackgroundCall(options);

    if (!isBackground) {
        useLoadingStore.getState()
            .show();
    }
    try {
        const { data, error, status } = await queryFn(supabase);
        if (error) {
            if (shouldRedirectToLogin(status, error)) {
                handleAuthFailure();
            }
            const parsed = parseServiceError(error);
            if (!isSilent) {
                notify(parsed.message, 'error');
            }
            return { data: null, error: parsed };
        }
        return { data: data as T, error: null };
    }
    catch (err) {
        const parsed = parseServiceError(err);
        if (!isSilent) {
            notify(parsed.message, 'error');
        }
        return { data: null, error: parsed };
    }
    finally {
        if (!isBackground) {
            useLoadingStore.getState()
                .hide();
        }
    }
}