import EnrollmentManagement from '@pages/registrar/enrollment-management';
import GradeRelease from '@pages/registrar/grade-release-management';
import RegistrarDashboard from '@pages/registrar/RegistrarDashboard';
import RegistrarLayout from '@pages/registrar/RegistrarLayout';
import StudentManagement from '@pages/registrar/student-management';
import { RouteObject } from 'react-router-dom';

export const registrarRoutes: RouteObject[] = [
    {
        element: <RegistrarLayout />,
        path: 'registrar',
        children: [
            { element: <RegistrarDashboard />, index: true },
            { element: <StudentManagement />, path: 'student-management' },
            { element: <EnrollmentManagement />, path: 'enrollment-management' },
            { element: <GradeRelease />, path: 'grade-release' }
        ]
    }
];