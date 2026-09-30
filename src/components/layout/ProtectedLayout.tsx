import PageLoadingFallback from '@components/loading/PageLoadingFallback';
import SessionTimeoutModal from '@components/modal/SessionTimeoutModal';
import NotificationModalContainer from '@components/notification/NotificationModalContainer';
import useIdleTimeout from '@hooks/useIdleTimeout';
import { logout, refreshSession } from '@services/auth.service';
import { useLoadingStore } from '@stores/loading.store';
import { useToastStore } from '@stores/toast.store';
import { Suspense, useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';

export default function ProtectedLayout() {
    const navigate = useNavigate();
    const { pathname } = useLocation();

    const { isIdle, resetTimer } = useIdleTimeout();

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
            <SessionTimeoutModal
                open={isIdle}
                onLogout={handleLogout}
                onStayLoggedIn={handleStayLoggedIn}
            />
            <NotificationModalContainer />
        </>
    );
}