import { ROLE_HOME } from '@constants/role.constant';
import { useAppStore } from '@stores/app.store';
import { Navigate } from 'react-router-dom';

interface RoleRedirectProps {
    targetPath?: string;
}

export default function RoleRedirect({ targetPath }: RoleRedirectProps = {}) {
    const activeRole = useAppStore((s) => s.activeRole);

    if (!activeRole) {
        return <Navigate replace to="/login" />;
    }

    const base = ROLE_HOME[activeRole];
    const destination = targetPath ? `${base}/${targetPath}` : base;

    return <Navigate replace to={destination} />;
}