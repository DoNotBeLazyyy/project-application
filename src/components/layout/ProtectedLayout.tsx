import SessionTimeoutModal from '@components/modal/SessionTimeoutModal';
import useIdleTimeout from '@hooks/useIdleTimeout';
import { logout } from '@services/auth.service';
import { supabase } from '@services/supabase.client';
import { useNavigate, Outlet } from 'react-router-dom';

export default function ProtectedLayout() {
    const navigate = useNavigate();

    const { isIdle, resetTimer } = useIdleTimeout({
        countdownTime: 60 * 1000,
        idleTime: 30 * 60 * 1000
    });

    async function handleLogout() {
        await logout();
        navigate('/login');
    }

    async function handleStayLoggedIn() {
        await supabase.auth.refreshSession();
        resetTimer();
    }

    return (
        <>
            <Outlet />
            <SessionTimeoutModal
                open={isIdle}
                onLogout={handleLogout}
                onStayLoggedIn={handleStayLoggedIn}
            />
        </>
    );
}