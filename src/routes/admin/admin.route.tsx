import AcademicThresholdManagement from '@pages/admin/academic-threshold-management';
import AdminDashboard from '@pages/admin/AdminDashboard';
import AdminLayout from '@pages/admin/AdminLayout';
import EvaluationManagement from '@pages/admin/evaluation-management';
import GradingConfiguration from '@pages/admin/grading-config-management';
import RoleManagement from '@pages/admin/role-management';
import SchoolYearManagement from '@pages/admin/school-year-management';
import SystemSettings from '@pages/admin/system-settings-management';
import TermManagement from '@pages/admin/term-management';
import TermTypeManagement from '@pages/admin/term-management/type';
import UserManagement from '@pages/admin/user-management';
import { RouteObject } from 'react-router-dom';

export const adminRoutes: RouteObject[] = [
    {
        element: <AdminLayout />,
        path: 'admin',
        children: [
            { element: <AdminDashboard />, index: true },
            { element: <UserManagement />, path: 'users' },
            { element: <SchoolYearManagement />, path: 'school-years' },
            { element: <GradingConfiguration />, path: 'grade-configurations' },
            { element: <EvaluationManagement />, path: 'evaluations' },
            { element: <RoleManagement />, path: 'roles' },
            { element: <TermManagement />, path: 'terms' },
            { element: <TermTypeManagement />, path: 'term-types' },
            { element: <AcademicThresholdManagement />, path: 'academic-thresholds' },
            { element: <SystemSettings />, path: 'system-settings' }
        ]
    }
];