import LoginPage from '@pages/auth/LoginPage';
import UnauthorizedPage from '@pages/auth/UnauthorizedPage';
import BasePage from '@pages/BasePage';
import AuthGuard from '@routes/guards/AuthGuard';
import { createBrowserRouter } from 'react-router-dom';

const appRouter = createBrowserRouter([
    {
        element: <BasePage />,
        path: '/',
        children: [
            { element: <LoginPage />, path: 'login' },
            { element: <UnauthorizedPage />, path: 'unauthorized' },
            {
                element: <AuthGuard />
            }
        ]
    }
]);

export default appRouter;