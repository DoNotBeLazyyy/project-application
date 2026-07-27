import { ROLE_HOME } from '@constants/role.constant';
import { useAppStore } from '@stores/app.store';
import { Navigate } from 'react-router-dom';

export default function RoleRedirect() {
    const activeRole = useAppStore((s) => s.activeRole);

    if (!activeRole) {
        return <Navigate replace to="/login" />;
    }

    return <Navigate replace to={ROLE_HOME[activeRole]} />;
}