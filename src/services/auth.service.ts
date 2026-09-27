import { supabase } from '@services/supabase.client';
import { callRpc } from '@services/supabase.wrapper';
import { useAppStore } from '@stores/app.store';
import { useToastStore } from '@stores/toast.store';
import { Session } from '@supabase/supabase-js';
import { AuthContext, AuthSessionStatus } from '@type/app.type';
import { ServiceResult } from '@type/service.type';
import { cookieStorage } from '@utils/cookie.util';
import { parseServiceError } from '@utils/error.util';
import {
    clearActivity,
    isSessionExpiredDueToInactivity,
    recordActivity
} from '@utils/session.util';

export const INCOMPLETE_PROFILE_MESSAGE = 'Your account is not fully set up. Contact your administrator.';
export const SUSPENDED_ACCOUNT_MESSAGE = 'Your account has been suspended. Please contact your administrator.';
export const INACTIVE_ACCOUNT_MESSAGE = 'Your account is currently inactive. Please contact your administrator.';

export async function login(email: string, password: string): Promise<ServiceResult<Session>> {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
        return { data: null, error: parseServiceError(error) };
    }

    recordActivity();

    const status = await initAuthSession();

    if (status !== 'authenticated') {
        const storeSession = useAppStore.getState().session;
        if (!storeSession) {
            const userProfile = useAppStore.getState().userProfile;
            let msg = INCOMPLETE_PROFILE_MESSAGE;
            if (userProfile?.status === 'Suspended') {
                msg = SUSPENDED_ACCOUNT_MESSAGE;
            }
            else if (userProfile?.status === 'Inactive') {
                msg = INACTIVE_ACCOUNT_MESSAGE;
            }
            return {
                data: null,
                error: { code: null, message: msg, status: null }
            };
        }
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
    clearActivity();
    await supabase.auth.signOut();
    useAppStore.getState()
        .clearSession();

    try {
        cookieStorage.removeItem('au-jas-app');
        if (typeof localStorage !== 'undefined') {
            localStorage.removeItem('au-jas-app');
        }
    }
    catch {
        // Safe ignore for restricted storage environments
    }
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
    if (isSessionExpiredDueToInactivity()) {
        await logout();
        useToastStore.getState()
            .showToast('Your session expired due to inactivity. Please sign in again.', 'info');
        return 'unauthenticated';
    }

    const { data: { session } } = await supabase.auth.getSession();

    const store = useAppStore.getState();
    store.setSession(session);

    if (!session) {
        store.clearSession();
        clearActivity();
        try {
            cookieStorage.removeItem('au-jas-app');
        }
        catch {
            // Safe ignore
        }
        return 'unauthenticated';
    }

    recordActivity();

    const { data: context, error } = await getAuthContext();

    if (!context || context.profile?.status === 'Suspended' || context.profile?.status === 'Inactive') {
        let msg = INCOMPLETE_PROFILE_MESSAGE;
        if (context?.profile?.status === 'Suspended' || error?.message?.includes('suspended')) {
            msg = SUSPENDED_ACCOUNT_MESSAGE;
        }
        else if (context?.profile?.status === 'Inactive' || error?.message?.includes('inactive')) {
            msg = INACTIVE_ACCOUNT_MESSAGE;
        }
        else if (error?.message) {
            msg = error.message;
        }

        await supabase.auth.signOut();
        store.clearSession();
        try {
            cookieStorage.removeItem('au-jas-app');
        }
        catch {
            // Safe ignore
        }

        useToastStore.getState()
            .showToast(msg, 'error');

        return 'incomplete';
    }

    store.setUserProfile(context.profile);
    store.setAvailableRoles(context.roles);
    store.resolveActiveRole();

    return 'authenticated';
}

export function setupAuthListener(): () => void {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        const store = useAppStore.getState();

        if (event === 'SIGNED_OUT' || (!session && store.session)) {
            store.clearSession();
            clearActivity();
            try {
                cookieStorage.removeItem('au-jas-app');
            }
            catch {
                // Safe ignore
            }

            if (
                typeof window !== 'undefined'
                && window.location.pathname !== '/login'
                && window.location.pathname !== '/set-password'
                && window.location.pathname !== '/forgot-password'
            ) {
                window.location.href = '/login';
            }
        }
        else if (session && event === 'TOKEN_REFRESHED') {
            store.setSession(session);
        }
    });

    return () => {
        subscription.unsubscribe();
    };
}