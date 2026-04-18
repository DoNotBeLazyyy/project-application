import ProtectedLayout from '@components/layout/ProtectedLayout';
import LoginPage from '@pages/auth/LoginPage';
import SetPasswordPage from '@pages/auth/SetPasswordPage';
import UnauthorizedPage from '@pages/auth/UnauthorizedPage';
import BasePage from '@pages/BasePage';
import { adminRoutes } from '@routes/admin/admin.route';
import { deanRoutes } from '@routes/dean/dean.route';
import { facultyRoutes } from '@routes/faculty/faculty.route';
import AuthGuard from '@routes/guards/AuthGuard';
import RoleGate from '@routes/guards/RoleGate';
import RoleRedirect from '@routes/guards/RoleRedirect';
import { registrarRoutes } from '@routes/registrar/registrar.route';
import { studentRoutes } from '@routes/student/student.route';
import { createBrowserRouter, Navigate } from 'react-router-dom';

const appRouter = createBrowserRouter([
    {
        element: <BasePage />,
        path: '/',
        children: [
            { element: <LoginPage />, path: 'login' },
            { element: <SetPasswordPage />, path: 'set-password' },
            {
                element: <AuthGuard />,
                children: [
                    { element: <UnauthorizedPage />, path: 'unauthorized' },
                    {
                        element: <ProtectedLayout />,
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
                            { element: <Navigate replace to="/unauthorized" />, path: '*' }
                        ]
                    }
                ]
            }
        ]
    }
]);

export default appRouter;