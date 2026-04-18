import { useAppStore } from '@stores/app.store';
import { UserRole } from '@type/app.type';
import { Navigate, Outlet } from 'react-router-dom';

interface RoleGateProps {
    allowedRoles: UserRole[];
}

export default function RoleGate({ allowedRoles }: RoleGateProps) {
    const activeRole = useAppStore((s) => s.activeRole);

    if (!activeRole || !allowedRoles.includes(activeRole)) {
        return <Navigate replace to="/unauthorized" />;
    }

    return <Outlet />;
}