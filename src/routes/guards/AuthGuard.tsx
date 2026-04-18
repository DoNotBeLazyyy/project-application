import { useAppStore } from '@stores/app.store';
import { Navigate, Outlet } from 'react-router-dom';

export default function AuthGuard() {
    const session = useAppStore((s) => s.session);

    if (!session) {
        return <Navigate replace to="/login" />;
    }

    return <Outlet />;
}