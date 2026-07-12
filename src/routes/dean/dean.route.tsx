import CourseManagement from '@pages/dean/course-management';
import CourseTypeManagement from '@pages/dean/course-management/type';
import CurriculumMapManagement from '@pages/dean/curriculum-map-management';
import DeanDashboard from '@pages/dean/DeanDashboard';
import DeanLayout from '@pages/dean/DeanLayout';
import DepartmentDetailPage from '@pages/dean/department-management/DepartmentDetailPage';
import DepartmentManagement from '@pages/dean/department-management';
import ProgramManagement from '@pages/dean/program-management';
import ProgramLevelManagement from '@pages/dean/program-management/level';
import SectionManagement from '@pages/dean/section-management';
import { RouteObject } from 'react-router-dom';

export const deanRoutes: RouteObject[] = [
    {
        element: <DeanLayout />,
        path: 'dean',
        children: [
            { element: <DeanDashboard />, index: true },
            { element: <ProgramLevelManagement />, path: 'program-level-management' },
            { element: <CourseTypeManagement />, path: 'course-type-management' },
            { element: <DepartmentManagement />, path: 'department-management' },
            { element: <DepartmentDetailPage />, path: 'department-management/new' },
            { element: <DepartmentDetailPage />, path: 'department-management/:id' },
            { element: <ProgramManagement />, path: 'program-management' },
            { element: <CourseManagement />, path: 'course-management' },
            { element: <CurriculumMapManagement />, path: 'curriculum-map-management' },
            { element: <SectionManagement />, path: 'section-management' }
        ]
    }
];