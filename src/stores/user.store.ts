import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// TODO: Change to login response
export interface UserDataProps {
    // Username
    username: string;

    // Password
    password: string;
}

type UserInfoProps = UserDataProps | null;

interface UserStoreProps {
    // User data
    userInfo: UserInfoProps;

    // Set handler to update the user data
    setUserInfo: (userInfo?: UserInfoProps) => void;
}

export const useUserStore = create<UserStoreProps>()(
    persist(
        (set) => ({
            userInfo: null,
            setUserInfo: (userInfo) => set({ userInfo })
        }), {
            name: 'userInfo',
            storage: createJSONStorage(() => localStorage)
        }
    )
);