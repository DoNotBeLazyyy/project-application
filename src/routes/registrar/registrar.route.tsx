import EnrollmentManagement from '@pages/registrar/enrollment-management';
import GradeRelease from '@pages/registrar/grade-release-management';
import RegistrarDashboard from '@pages/registrar/RegistrarDashboard';
import RegistrarLayout from '@pages/registrar/RegistrarLayout';
import StudentManagement from '@pages/registrar/student-management';
import AnnouncementDetailPage from '@pages/shared/announcement-management/AnnouncementDetailPage';
import AnnouncementManagement from '@pages/shared/announcement-management';
import EventDetailPage from '@pages/shared/event-management/EventDetailPage';
import EventManagement from '@pages/shared/event-management';
import { RouteObject } from 'react-router-dom';

export const registrarRoutes: RouteObject[] = [
    {
        element: <RegistrarLayout />,
        path: 'registrar',
        children: [
            { element: <RegistrarDashboard />, index: true },
            { element: <StudentManagement />, path: 'student-management' },
            { element: <EnrollmentManagement />, path: 'enrollment-management' },
            { element: <GradeRelease />, path: 'grade-release' },
            { element: <AnnouncementManagement />, path: 'announcement-management' },
            { element: <AnnouncementDetailPage />, path: 'announcement-management/new' },
            { element: <AnnouncementDetailPage />, path: 'announcement-management/:id' },
            { element: <EventManagement />, path: 'event-management' },
            { element: <EventDetailPage />, path: 'event-management/new' },
            { element: <EventDetailPage />, path: 'event-management/:id' }
        ]
    }
];