import { logout } from '@services/auth.service';
import { useAppStore } from '@stores/app.store';
import { isSessionExpiredDueToInactivity } from '@utils/session.util';
import { parseAuthUrlError } from '@utils/auth-error.util';
import { useEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';

export default function AuthGuard() {
    const session = useAppStore((s) => s.session);
    const userProfile = useAppStore((s) => s.userProfile);
    const { pathname } = useLocation();

    const isExpired = Boolean(session && isSessionExpiredDueToInactivity());
    const isSuspendedOrInactive = Boolean(
        userProfile && (userProfile.status === 'Suspended' || userProfile.status === 'Inactive')
    );

    useEffect(() => {
        if (isExpired || isSuspendedOrInactive) {
            logout();
        }
    }, [isExpired, isSuspendedOrInactive]);

    if (!session || isExpired || isSuspendedOrInactive) {
        const authErr = parseAuthUrlError();
        return (
            <Navigate
                replace
                state={authErr ? { authError: authErr.userMessage } : undefined}
                to="/login"
            />
        );
    }

    if (userProfile?.status === 'Invited' && pathname !== '/set-password') {
        return <Navigate replace to="/set-password" />;
    }

    return <Outlet />;
}