import { supabase } from '@services/supabase.client';
import { callRpc } from '@services/supabase.wrapper';
import { useAppStore } from '@stores/app.store';
import { Session } from '@supabase/supabase-js';
import { AuthContext } from '@type/app.type';
import { ServiceResult } from '@type/service.type';
import { parseServiceError } from '@utils/error.util';

export async function login(email: string, password: string): Promise<ServiceResult<Session>> {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
        return { data: null, error: parseServiceError(error) };
    }
    await initAuthSession();
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

export async function getAuthContext(): Promise<ServiceResult<AuthContext>> {
    return callRpc<AuthContext>('fn_get_auth_context');
}

export async function initAuthSession(): Promise<void> {
    const { data: { session } } = await supabase.auth.getSession();

    const store = useAppStore.getState();
    store.setSession(session);

    if (!session) {
        store.clearSession();
        return;
    }

    const { data: context } = await getAuthContext();

    if (!context) {
        return;
    }

    store.setUserProfile(context.profile);
    store.setAvailableRoles(context.roles);
    store.resolveActiveRole();
}