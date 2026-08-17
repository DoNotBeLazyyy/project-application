import { supabase } from '@services/supabase.client';
import { callRpc } from '@services/supabase.wrapper';
import { useAppStore } from '@stores/app.store';
import { useToastStore } from '@stores/toast.store';
import { Session } from '@supabase/supabase-js';
import { AuthContext, AuthSessionStatus } from '@type/app.type';
import { ServiceResult } from '@type/service.type';
import { parseServiceError } from '@utils/error.util';

export const INCOMPLETE_PROFILE_MESSAGE = 'Your account is not fully set up. Contact your administrator.';

export async function login(email: string, password: string): Promise<ServiceResult<Session>> {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
        return { data: null, error: parseServiceError(error) };
    }

    const status = await initAuthSession();

    if (status === 'incomplete') {
        return {
            data: null,
            error: { code: null, message: INCOMPLETE_PROFILE_MESSAGE, status: null }
        };
    }

    return { data: data.session, error: null };
}

export async function requestPasswordReset(email: string): Promise<ServiceResult<null>> {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/set-password`
    });

    if (error) {
        return { data: null, error: parseServiceError(error) };
    }

    return { data: null, error: null };
}

export async function logout(): Promise<void> {
    await supabase.auth.signOut();
    useAppStore.getState()
        .clearSession();
}

export async function refreshSession(): Promise<ServiceResult<Session>> {
    const { data, error } = await supabase.auth.refreshSession();

    if (error || !data.session) {
        return {
            data: null,
            error: error
                ? parseServiceError(error)
                : {
                    code: null,
                    message: 'Your session could not be renewed. Please sign in again.',
                    status: null
                }
        };
    }

    return { data: data.session, error: null };
}

export async function getAuthContext(): Promise<ServiceResult<AuthContext>> {
    return callRpc<AuthContext>('fn_get_auth_context');
}

export async function initAuthSession(): Promise<AuthSessionStatus> {
    const { data: { session } } = await supabase.auth.getSession();

    const store = useAppStore.getState();
    store.setSession(session);

    if (!session) {
        store.clearSession();
        return 'unauthenticated';
    }

    const { data: context, error } = await getAuthContext();

    if (!context) {
        await supabase.auth.signOut();
        store.clearSession();

        if (!error) {
            useToastStore.getState()
                .showToast(INCOMPLETE_PROFILE_MESSAGE, 'error');
        }

        return 'incomplete';
    }

    store.setUserProfile(context.profile);
    store.setAvailableRoles(context.roles);
    store.resolveActiveRole();

    return 'authenticated';
}