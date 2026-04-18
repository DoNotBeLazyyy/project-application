import { Session } from '@supabase/supabase-js';
import { RoleItem, UserProfile, UserRole } from '@type/app.type';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface AppState {
    session: Session | null;
    activeRole: UserRole | null;
    userProfile: UserProfile | null;
    availableRoles: RoleItem[];
    isLoading: boolean;
}

interface AppActions {
    setSession: (session: Session | null) => void;
    setActiveRole: (role: UserRole) => void;
    setUserProfile: (profile: UserProfile | null) => void;
    setAvailableRoles: (roles: RoleItem[]) => void;
    setIsLoading: (loading: boolean) => void;
    resolveActiveRole: () => void;
    clearSession: () => void;
}

type AppStore = AppState & AppActions;

export const useAppStore = create<AppStore>()(
    persist(
        (set, get) => ({
            session: null,
            activeRole: null,
            userProfile: null,
            availableRoles: [],
            isLoading: false,
            setSession: (session) => set({ session }),
            setActiveRole: (role) => set({ activeRole: role }),
            setUserProfile: (profile) => set({ userProfile: profile }),
            setAvailableRoles: (roles) => set({ availableRoles: roles }),
            setIsLoading: (loading) => set({ isLoading: loading }),
            resolveActiveRole: () => {
                const { activeRole, availableRoles } = get();
                if (availableRoles.length === 0) {
                    set({ activeRole: null });
                    return;
                }
                const stillValid = availableRoles.some((r) => r.code === activeRole);
                if (stillValid) {
                    return;
                }
                set({ activeRole: availableRoles[0].code });
            },
            clearSession: () => set({
                session: null,
                activeRole: null,
                userProfile: null,
                availableRoles: []
            })
        }),
        {
            name: 'au-jas-app',
            storage: createJSONStorage(() => localStorage),
            partialize: (state) => ({
                session: state.session,
                activeRole: state.activeRole
            })
        }
    )
);