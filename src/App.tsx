import GlobalErrorBoundary from '@components/error/GlobalErrorBoundary';
import CommonToast from '@components/toast/CommonToast';
import { CssBaseline } from '@mui/material';
import { ThemeProvider } from '@mui/material/styles';
import appRouter from '@routes/AppRouter';
import { initAuthSession, setupAuthListener } from '@services/auth.service';
import { initMonitoring } from '@utils/monitoring.util';
import { initThemeMode } from '@utils/theme-mode.util';
import { theme } from '@utils/theme.util';
import { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';

export default function App() {
    useEffect(() => {
        initMonitoring();
        initAuthSession();
        const cleanupTheme = initThemeMode();
        const unsubscribe = setupAuthListener();

        return () => {
            cleanupTheme();
            unsubscribe();
        };
    }, []);

    return (
        <GlobalErrorBoundary>
            <ThemeProvider defaultMode="system" theme={theme}>
                <CssBaseline />
                <RouterProvider router={appRouter} />
                <CommonToast />
            </ThemeProvider>
        </GlobalErrorBoundary>
    );
}
