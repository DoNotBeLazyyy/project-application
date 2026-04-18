import { CssBaseline } from '@mui/material';
import { ThemeProvider } from '@mui/material/styles';
import { initAuthSession } from '@services/auth.service';
import appRouter from '@routes/AppRouter';
import { theme } from '@utils/theme.util';
import { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';

export default function App() {
    useEffect(() => {
        initAuthSession();
    }, []);

    return (
        <ThemeProvider theme={theme}>
            <CssBaseline />
            <RouterProvider router={appRouter} />
        </ThemeProvider>
    );
}