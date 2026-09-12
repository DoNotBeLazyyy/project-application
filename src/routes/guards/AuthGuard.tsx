import { logout } from '@services/auth.service';
import { useAppStore } from '@stores/app.store';
import { isSessionExpiredDueToInactivity } from '@utils/session.util';
import { useEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';

export default function AuthGuard() {
    const session = useAppStore((s) => s.session);
    const userProfile = useAppStore((s) => s.userProfile);
    const { pathname } = useLocation();

    const isExpired = Boolean(session && isSessionExpiredDueToInactivity());

    useEffect(() => {
        if (isExpired) {
            logout();
        }
    }, [isExpired]);

    if (!session || isExpired) {
        return <Navigate replace to="/login" />;
    }

    if (userProfile?.status === 'Invited' && pathname !== '/set-password') {
        return <Navigate replace to="/set-password" />;
    }

    return <Outlet />;
}