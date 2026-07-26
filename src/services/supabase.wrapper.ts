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

interface CallRpcOptions {
    silent?: boolean;
}

export async function callRpc<T>(
    fn: string,
    params?: Record<string, unknown>,
    options?: CallRpcOptions
): Promise<ServiceResult<T>> {
    const isSilent = options?.silent === true;

    if (!isSilent) {
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
            useToastStore.getState()
                .showToast(parsed.message, 'error');
            return { data: null, error: parsed };
        }

        if (isRpcFailurePayload(data)) {
            useToastStore.getState()
                .showToast(data.message, 'error');
            return {
                data: null,
                error: { code: null, message: data.message, status: null }
            };
        }

        if (isRpcSuccessPayload(data)) {
            useToastStore.getState()
                .showToast(data.message, 'success');
        }

        return { data: data as T, error: null };
    }
    catch (err) {
        const parsed = parseServiceError(err);
        useToastStore.getState()
            .showToast(parsed.message, 'error');
        return { data: null, error: parsed };
    }
    finally {
        if (!isSilent) {
            useLoadingStore.getState()
                .hide();
        }
    }
}

export async function callQuery<T>(queryFn: QueryBuilderFn): Promise<ServiceResult<T[]>> {
    useLoadingStore.getState()
        .show();
    try {
        const { data, error, status } = await queryFn(supabase);
        if (error) {
            if (shouldRedirectToLogin(status, error)) {
                handleAuthFailure();
            }
            return { data: null, error: parseServiceError(error) };
        }
        return { data: data as T[], error: null };
    }
    catch (err) {
        return { data: null, error: parseServiceError(err) };
    }
    finally {
        useLoadingStore.getState()
            .hide();
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
    body?: Record<string, unknown>
): Promise<ServiceResult<T>> {
    try {
        const { data, error } = await supabase.functions.invoke<T>(name, { body });

        if (error) {
            const parsed = await parseFunctionError(error);
            if (shouldRedirectToLogin(parsed.status ?? undefined, parsed)) {
                handleAuthFailure();
            }
            useToastStore.getState()
                .showToast(parsed.message, 'error');
            return { data: null, error: parsed };
        }

        if (isRpcFailurePayload(data)) {
            useToastStore.getState()
                .showToast(data.message, 'error');
            return {
                data: null,
                error: { code: null, message: data.message, status: null }
            };
        }

        return { data: data as T, error: null };
    }
    catch (err) {
        const parsed = parseServiceError(err);
        useToastStore.getState()
            .showToast(parsed.message, 'error');
        return { data: null, error: parsed };
    }
}

export async function callSingle<T>(queryFn: QueryBuilderFn): Promise<ServiceResult<T>> {
    useLoadingStore.getState()
        .show();
    try {
        const { data, error, status } = await queryFn(supabase);
        if (error) {
            if (shouldRedirectToLogin(status, error)) {
                handleAuthFailure();
            }
            return { data: null, error: parseServiceError(error) };
        }
        return { data: data as T, error: null };
    }
    catch (err) {
        return { data: null, error: parseServiceError(err) };
    }
    finally {
        useLoadingStore.getState()
            .hide();
    }
}