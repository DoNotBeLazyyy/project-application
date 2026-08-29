import PageLoadingFallback from '@components/loading/PageLoadingFallback';
import SessionTimeoutModal from '@components/modal/SessionTimeoutModal';
import useIdleTimeout from '@hooks/useIdleTimeout';
import AiAssistant from '@pages/shared/assistant/AiAssistant';
import { logout, refreshSession } from '@services/auth.service';
import { useLoadingStore } from '@stores/loading.store';
import { useToastStore } from '@stores/toast.store';
import { Suspense, useEffect } from 'react';
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
        const result = await refreshSession();

        if (result.error) {
            useToastStore.getState()
                .showToast(result.error.message, 'error');
            await handleLogout();
            return;
        }

        resetTimer();
    }

    return (
        <>
            <Suspense fallback={<PageLoadingFallback />}>
                <Outlet />
            </Suspense>
            <AiAssistant />
            <SessionTimeoutModal
                open={isIdle}
                onLogout={handleLogout}
                onStayLoggedIn={handleStayLoggedIn}
            />
        </>
    );
}