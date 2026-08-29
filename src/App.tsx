import GlobalErrorBoundary from '@components/error/GlobalErrorBoundary';
import CommonToast from '@components/toast/CommonToast';
import { CssBaseline } from '@mui/material';
import { ThemeProvider } from '@mui/material/styles';
import appRouter from '@routes/AppRouter';
import { initAuthSession } from '@services/auth.service';
import { initMonitoring } from '@utils/monitoring.util';
import { theme } from '@utils/theme.util';
import { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';

export default function App() {
    useEffect(() => {
        initMonitoring();
        initAuthSession();
    }, []);

    return (
        <GlobalErrorBoundary>
            <ThemeProvider theme={theme}>
                <CssBaseline />
                <RouterProvider router={appRouter} />
                <CommonToast />
            </ThemeProvider>
        </GlobalErrorBoundary>
    );
}