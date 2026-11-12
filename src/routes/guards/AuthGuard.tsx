import useAccountStatusWatch from '@routes/guards/use-account-status-watch';
import { getBlockedAccountMessage, logout } from '@services/auth.service';
import { useAppStore } from '@stores/app.store';
import { parseAuthUrlError } from '@utils/auth-error.util';
import { isSessionExpiredDueToInactivity } from '@utils/session.util';
import { useEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';

export default function AuthGuard() {
    const session = useAppStore((s) => s.session);
    const userProfile = useAppStore((s) => s.userProfile);
    const { pathname, search } = useLocation();

    const isExpired = Boolean(session && isSessionExpiredDueToInactivity());
    const blockedMessage = getBlockedAccountMessage(userProfile?.status);
    const isSuspendedOrInactive = Boolean(blockedMessage);

    useAccountStatusWatch(Boolean(session) && !isExpired && !isSuspendedOrInactive);

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
                state={{
                    authError: blockedMessage ?? authErr?.userMessage,
                    from: `${pathname}${search}`
                }}
                to="/login"
            />
        );
    }

    if (userProfile?.status === 'Invited' && pathname !== '/set-password') {
        return (
            <Navigate
                replace
                to="/set-password"
            />
        );
    }

    return <Outlet />;
}