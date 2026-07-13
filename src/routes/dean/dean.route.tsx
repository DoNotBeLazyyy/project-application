import CourseManagement from '@pages/dean/course-management';
import CourseTypeManagement from '@pages/dean/course-management/type';
import CurriculumMapManagement from '@pages/dean/curriculum-map-management';
import DeanDashboard from '@pages/dean/DeanDashboard';
import DeanLayout from '@pages/dean/DeanLayout';
import DepartmentDetailPage from '@pages/dean/department-management/DepartmentDetailPage';
import DepartmentManagement from '@pages/dean/department-management';
import FacultyLoadDetailPage from '@pages/dean/faculty-load/FacultyLoadDetailPage';
import FacultyLoadManagement from '@pages/dean/faculty-load';
import ProgramManagement from '@pages/dean/program-management';
import ProgramLevelManagement from '@pages/dean/program-management/level';
import SectionManagement from '@pages/dean/section-management';
import AnnouncementDetailPage from '@pages/shared/announcement-management/AnnouncementDetailPage';
import AnnouncementManagement from '@pages/shared/announcement-management';
import EventDetailPage from '@pages/shared/event-management/EventDetailPage';
import EventManagement from '@pages/shared/event-management';
import ProfilePage from '@pages/shared/profile';
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
            { element: <SectionManagement />, path: 'section-management' },
            { element: <FacultyLoadManagement />, path: 'faculty-load' },
            { element: <FacultyLoadDetailPage />, path: 'faculty-load/:facultyId' },
            { element: <ProfilePage />, path: 'profile' },
            { element: <AnnouncementManagement />, path: 'announcement-management' },
            { element: <AnnouncementDetailPage />, path: 'announcement-management/new' },
            { element: <AnnouncementDetailPage />, path: 'announcement-management/:id' },
            { element: <EventManagement />, path: 'event-management' },
            { element: <EventDetailPage />, path: 'event-management/new' },
            { element: <EventDetailPage />, path: 'event-management/:id' }
        ]
    }
];