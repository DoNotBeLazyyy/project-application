import SessionTimeoutModal from '@components/modal/SessionTimeoutModal';
import useIdleTimeout from '@hooks/useIdleTimeout';
import AiAssistant from '@pages/shared/assistant/AiAssistant';
import { logout } from '@services/auth.service';
import { supabase } from '@services/supabase.client';
import { useLoadingStore } from '@stores/loading.store';
import { useEffect } from 'react';
import { useLocation, useNavigate, Outlet } from 'react-router-dom';

export default function ProtectedLayout() {
    const navigate = useNavigate();
    const { pathname } = useLocation();

    const { isIdle, resetTimer } = useIdleTimeout({
        countdownTime: 60 * 1000,
        idleTime: 30 * 60 * 1000
    });

    useEffect(function() {
        return function() {
            useLoadingStore.getState()
                .reset();
        };
    }, [pathname]);

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
            <AiAssistant />
            <SessionTimeoutModal
                open={isIdle}
                onLogout={handleLogout}
                onStayLoggedIn={handleStayLoggedIn}
            />
        </>
    );
}