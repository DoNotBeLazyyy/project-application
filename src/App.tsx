import GlobalErrorBoundary from '@components/error/GlobalErrorBoundary';
import PageLoadingFallback from '@components/loading/PageLoadingFallback';
import CommonToast from '@components/toast/CommonToast';
import { CssBaseline } from '@mui/material';
import { ThemeProvider } from '@mui/material/styles';
import appRouter from '@routes/AppRouter';
import { bootstrapAuthSession, setupAuthListener } from '@services/auth.service';
import { initMonitoring } from '@utils/monitoring.util';
import { initThemeMode } from '@utils/theme-mode.util';
import { theme } from '@utils/theme.util';
import { useEffect, useState } from 'react';
import { RouterProvider } from 'react-router-dom';

export default function App() {
    const [isAuthReady, setIsAuthReady] = useState(false);

    useEffect(() => {
        initMonitoring();
        bootstrapAuthSession()
            .finally(() => setIsAuthReady(true));
        const cleanupTheme = initThemeMode();
        const unsubscribe = setupAuthListener();

        return () => {
            cleanupTheme();
            unsubscribe();
        };
    }, []);

    return (
        <GlobalErrorBoundary>
            <ThemeProvider
                defaultMode="system"
                theme={theme}
            >
                <CssBaseline />
                {isAuthReady
                    ? <RouterProvider router={appRouter} />
                    : <PageLoadingFallback />}
                <CommonToast />
            </ThemeProvider>
        </GlobalErrorBoundary>
    );
}