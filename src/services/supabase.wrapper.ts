import { SupabaseClient } from '@supabase/supabase-js';
import { useLoadingStore } from '@stores/loading.store';
import { ServiceResult } from '@type/service.type';
import { parseServiceError } from '@utils/error.util';
import { supabase } from '@services/supabase.client';

interface RawResponse { data: unknown; error: unknown }
type QueryBuilderFn = (client: SupabaseClient) => PromiseLike<RawResponse>;

export async function callRpc<T>(
    fn: string,
    params?: Record<string, unknown>
): Promise<ServiceResult<T>> {
    useLoadingStore.getState()
        .show();
    try {
        const { data, error } = await supabase.rpc(fn, params);
        if (error) {
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

export async function callQuery<T>(queryFn: QueryBuilderFn): Promise<ServiceResult<T[]>> {
    useLoadingStore.getState()
        .show();
    try {
        const { data, error } = await queryFn(supabase);
        if (error) {
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
        const { data, error } = await queryFn(supabase);
        if (error) {
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