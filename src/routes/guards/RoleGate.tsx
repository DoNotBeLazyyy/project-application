import { ROLE_HOME } from '@constants/role.constant';
import { useAppStore } from '@stores/app.store';
import { useToastStore } from '@stores/toast.store';
import { UserRole } from '@type/app.type';
import { useEffect } from 'react';
import { Navigate, Outlet } from 'react-router-dom';

interface RoleGateProps {
    allowedRoles: UserRole[];
}

export default function RoleGate({ allowedRoles }: RoleGateProps) {
    const activeRole = useAppStore((s) => s.activeRole);

    const isCurrentActiveRoleAllowed = Boolean(activeRole && allowedRoles.includes(activeRole));

    useEffect(() => {
        if (activeRole && !allowedRoles.includes(activeRole)) {
            useToastStore.getState().showToast(
                'Access Denied: You do not have permission to access this page.',
                'error'
            );
        }
    }, [activeRole, allowedRoles]);

    if (!activeRole) {
        return <Navigate replace to="/unauthorized" />;
    }

    if (!isCurrentActiveRoleAllowed) {
        const fallbackHome = ROLE_HOME[activeRole] || '/unauthorized';
        return <Navigate replace to={fallbackHome} />;
    }

    return <Outlet />;
}