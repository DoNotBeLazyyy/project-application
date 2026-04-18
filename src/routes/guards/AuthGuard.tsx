import { useAppStore } from '@stores/app.store';
import { Navigate, Outlet, useLocation } from 'react-router-dom';

export default function AuthGuard() {
    const session = useAppStore((s) => s.session);
    const userProfile = useAppStore((s) => s.userProfile);
    const { pathname } = useLocation();

    if (!session) {
        return <Navigate replace to="/login" />;
    }

    if (userProfile?.status === 'Invited' && pathname !== '/set-password') {
        return <Navigate replace to="/set-password" />;
    }

    return <Outlet />;
}