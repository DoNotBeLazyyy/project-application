import { supabase } from '@services/supabase.client';
import { useAppStore } from '@stores/app.store';
import { useLoadingStore } from '@stores/loading.store';
import { useToastStore } from '@stores/toast.store';
import { SupabaseClient } from '@supabase/supabase-js';
import { ServiceResult } from '@type/service.type';
import { parseServiceError } from '@utils/error.util';

interface RawResponse {
    data: unknown;
    error: unknown;
    status?: number;
}

type QueryBuilderFn = (client: SupabaseClient) => PromiseLike<RawResponse>;

function isAuthFailure(status?: number): boolean {
    return status === 401 || status === 403;
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

export async function callRpc<T>(
    fn: string,
    params?: Record<string, unknown>
): Promise<ServiceResult<T>> {
    useLoadingStore.getState()
        .show();
    try {
        const { data, error, status } = await supabase.rpc(fn, params);

        if (error) {
            if (isAuthFailure(status)) {
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
        useLoadingStore.getState()
            .hide();
    }
}

export async function callQuery<T>(queryFn: QueryBuilderFn): Promise<ServiceResult<T[]>> {
    useLoadingStore.getState()
        .show();
    try {
        const { data, error, status } = await queryFn(supabase);
        if (error) {
            if (isAuthFailure(status)) {
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

export async function callSingle<T>(queryFn: QueryBuilderFn): Promise<ServiceResult<T>> {
    useLoadingStore.getState()
        .show();
    try {
        const { data, error, status } = await queryFn(supabase);
        if (error) {
            if (isAuthFailure(status)) {
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