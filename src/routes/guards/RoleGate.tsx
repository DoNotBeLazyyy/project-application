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
    const availableRoles = useAppStore((s) => s.availableRoles);
    const setActiveRole = useAppStore((s) => s.setActiveRole);

    const matchingRole = availableRoles.find((r) => allowedRoles.includes(r.code));
    const isAuthorized = Boolean(matchingRole);

    useEffect(() => {
        if (availableRoles.length > 0 && !isAuthorized) {
            useToastStore.getState().showToast(
                'Access Denied: You do not have permission to access this page.',
                'error'
            );
        } else if (matchingRole && activeRole !== matchingRole.code) {
            setActiveRole(matchingRole.code);
        }
    }, [activeRole, allowedRoles, availableRoles, isAuthorized, matchingRole, setActiveRole]);

    if (!isAuthorized) {
        const fallbackHome = activeRole ? ROLE_HOME[activeRole] : '/login';
        return <Navigate replace to={fallbackHome} />;
    }

    return <Outlet />;
}