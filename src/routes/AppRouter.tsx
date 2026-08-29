import ProtectedLayout from '@components/layout/ProtectedLayout';
import BasePage from '@pages/BasePage';
import ErrorPage from '@pages/error/ErrorPage';
import { adminRoutes } from '@routes/admin/admin.route';
import { deanRoutes } from '@routes/dean/dean.route';
import { facultyRoutes } from '@routes/faculty/faculty.route';
import AuthGuard from '@routes/guards/AuthGuard';
import RoleGate from '@routes/guards/RoleGate';
import RoleRedirect from '@routes/guards/RoleRedirect';
import { registrarRoutes } from '@routes/registrar/registrar.route';
import { studentRoutes } from '@routes/student/student.route';
import { lazyElement } from '@utils/lazy.util';
import { createBrowserRouter } from 'react-router-dom';

const appRouter = createBrowserRouter([
    {
        element: <BasePage />,
        errorElement: <ErrorPage />,
        path: '/',
        children: [
            {
                element: lazyElement(function() {
                    return import('@pages/auth/LoginPage');
                }),
                path: 'login'
            },
            {
                element: lazyElement(function() {
                    return import('@pages/auth/ForgotPasswordPage');
                }),
                path: 'forgot-password'
            },
            {
                element: lazyElement(function() {
                    return import('@pages/auth/SetPasswordPage');
                }),
                path: 'set-password'
            },
            {
                element: <AuthGuard />,
                children: [
                    {
                        element: lazyElement(function() {
                            return import('@pages/auth/UnauthorizedPage');
                        }),
                        path: 'unauthorized'
                    },
                    {
                        element: <ProtectedLayout />,
                        errorElement: <ErrorPage />,
                        children: [
                            { element: <RoleRedirect />, index: true },
                            {
                                element: <RoleGate allowedRoles={['Admin']} />,
                                children: adminRoutes
                            },
                            {
                                element: <RoleGate allowedRoles={['Dean']} />,
                                children: deanRoutes
                            },
                            {
                                element: <RoleGate allowedRoles={['Registrar']} />,
                                children: registrarRoutes
                            },
                            {
                                element: <RoleGate allowedRoles={['Faculty']} />,
                                children: facultyRoutes
                            },
                            {
                                element: <RoleGate allowedRoles={['Student']} />,
                                children: studentRoutes
                            },
                            { element: <ErrorPage isNotFound />, path: '*' }
                        ]
                    }
                ]
            }
        ]
    }
]);

export default appRouter;