import { CssBaseline } from '@mui/material';
import { ThemeProvider } from '@mui/material/styles';
import appRouter from '@router/AppRouter';
import { theme } from '@utils/theme-util';
import { RouterProvider } from 'react-router-dom';

export default function App() {
    return (
        <ThemeProvider theme={theme}>
            <CssBaseline />
            <RouterProvider router={appRouter} />
        </ThemeProvider>
    );
}