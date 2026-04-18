import { Session } from '@supabase/supabase-js';
import { supabase } from '@services/supabase.client';
import { callQuery, callSingle } from '@services/supabase.wrapper';
import { useAppStore } from '@stores/app.store';
import { RoleItem, UserProfile, UserRole } from '@type/app.type';
import { ServiceResult } from '@type/service.type';
import { parseServiceError } from '@utils/error.util';

interface UserRoleJoinRow {
    role_id: string;
    roles: { id: string; code: UserRole; label: string }[];
}

export async function login(email: string, password: string): Promise<ServiceResult<Session>> {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
        return { data: null, error: parseServiceError(error) };
    }
    await initAuthSession();
    return { data: data.session, error: null };
}

export async function logout(): Promise<void> {
    await supabase.auth.signOut();
    useAppStore.getState()
        .clearSession();
}

export async function initAuthSession(): Promise<void> {
    const { data: { session } } = await supabase.auth.getSession();

    const store = useAppStore.getState();
    store.setSession(session);

    if (!session) {
        store.clearSession();
        return;
    }

    store.setIsLoading(true);

    const userId = session.user.id;

    const profileResult = await callSingle<UserProfile>((client) =>
        client
            .from('users')
            .select('id, first_name, middle_name, last_name, suffix, preferred_name, email, mobile_number, avatar_url')
            .eq('id', userId)
            .is('deleted_at', null)
            .single());

    if (profileResult.data) {
        store.setUserProfile(profileResult.data);
    }

    const rolesResult = await callQuery<UserRoleJoinRow>((client) =>
        client
            .from('user_roles')
            .select('role_id, roles(id, code, label)')
            .eq('user_id', userId)
            .is('deleted_at', null));

    if (rolesResult.data) {
        const roles: RoleItem[] = rolesResult.data
            .map((row) => row.roles[0])
            .filter((r): r is RoleItem => r !== null && r !== undefined);

        store.setAvailableRoles(roles);
        store.resolveActiveRole();
    }

    store.setIsLoading(false);
}