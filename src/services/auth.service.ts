import { supabase } from '@services/supabase.client';
import { callRpc } from '@services/supabase.wrapper';
import { useAppStore } from '@stores/app.store';
import { useToastStore } from '@stores/toast.store';
import { Session } from '@supabase/supabase-js';
import { AuthContext, AuthSessionStatus } from '@type/app.type';
import { VerifyEmailResult } from '@type/auth.type';
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
        const parsed = parseServiceError(error);
        useToastStore.getState()
            .showToast(parsed.message, 'error');
        return { data: null, error: parsed };
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
                error: {
                    code: null, message: msg, status: null
                }
            };
        }
    }

    return { data: data.session, error: null };
}

export async function verifyUserEmail(email: string): Promise<ServiceResult<VerifyEmailResult>> {
    const trimmedEmail = email.trim()
        .toLowerCase();
    if (!trimmedEmail) {
        return {
            data: null,
            error: {
                code: 'INVALID_EMAIL',
                message: 'Please enter an email address.',
                status: null
            }
        };
    }

    return callRpc<VerifyEmailResult>(
        'fn_verify_user_email',
        { p_email: trimmedEmail },
        { silent: true }
    );
}

export async function requestPasswordReset(email: string): Promise<ServiceResult<null>> {
    const trimmedEmail = email.trim()
        .toLowerCase();

    // 1. Verify if email exists in system before requesting password reset
    const { data: verification, error: verifyError } = await verifyUserEmail(trimmedEmail);

    if (verifyError || !verification?.exists) {
        const message = verifyError?.message || verification?.message || 'This email address does not exist in our records.';
        return {
            data: null,
            error: {
                code: 'EMAIL_NOT_FOUND',
                message,
                status: null
            }
        };
    }

    if (verification.status === 'Suspended') {
        return {
            data: null,
            error: {
                code: 'ACCOUNT_SUSPENDED',
                message: SUSPENDED_ACCOUNT_MESSAGE,
                status: null
            }
        };
    }

    if (verification.status === 'Inactive') {
        return {
            data: null,
            error: {
                code: 'ACCOUNT_INACTIVE',
                message: INACTIVE_ACCOUNT_MESSAGE,
                status: null
            }
        };
    }

    // 2. Email exists and is active, proceed to request password reset
    const { error } = await supabase.auth.resetPasswordForEmail(trimmedEmail, {
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
        if (typeof window !== 'undefined' && window.location.pathname === '/set-password') {
            return 'unauthenticated';
        }

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

/**
 * Starts the session check when the app opens. It waits for the check only when the saved
 * profile belongs to someone other than the signed-in user, so pages never route with
 * another account's roles.
 */
export async function bootstrapAuthSession(): Promise<void> {
    const { data: { session } } = await supabase.auth.getSession();
    const storedUserId = useAppStore.getState().userProfile?.id;
    const isStoredUserStale = Boolean(session && storedUserId !== session.user.id);
    const sessionCheck = initAuthSession();

    if (isStoredUserStale) {
        await sessionCheck;
    }
}

export function setupAuthListener(): VoidFunction {
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