import { ROLE_HOME } from '@constants/role.constant';
import { useAppStore } from '@stores/app.store';
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

    useEffect(() => {
        if (activeRole && !allowedRoles.includes(activeRole) && matchingRole) {
            setActiveRole(matchingRole.code);
        }
    }, [activeRole, allowedRoles, matchingRole, setActiveRole]);

    if (!activeRole) {
        return <Navigate replace to="/unauthorized" />;
    }

    if (!allowedRoles.includes(activeRole)) {
        if (matchingRole) {
            return <Outlet />;
        }

        return <Navigate replace to={ROLE_HOME[activeRole]} />;
    }

    return <Outlet />;
}