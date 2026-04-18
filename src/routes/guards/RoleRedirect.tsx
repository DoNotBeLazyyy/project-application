import { useAppStore } from '@stores/app.store';
import { UserRole } from '@type/app.type';
import { Navigate } from 'react-router-dom';

const ROLE_PATHS: Record<UserRole, string> = {
    Admin: '/admin',
    Dean: '/dean',
    Faculty: '/faculty',
    Registrar: '/registrar',
    Student: '/student'
};

export default function RoleRedirect() {
    const activeRole = useAppStore((s) => s.activeRole);

    if (!activeRole) {
        return <Navigate replace to="/login" />;
    }

    return <Navigate replace to={ROLE_PATHS[activeRole]} />;
}