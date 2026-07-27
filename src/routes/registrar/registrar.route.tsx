import BatchProgression from '@pages/registrar/batch-progression';
import EnrollmentManagement from '@pages/registrar/enrollment-management';
import GradeRelease from '@pages/registrar/grade-release-management';
import RegistrarDashboard from '@pages/registrar/RegistrarDashboard';
import RegistrarLayout from '@pages/registrar/RegistrarLayout';
import StudentManagement from '@pages/registrar/student-management';
import StudentRecordsPage from '@pages/registrar/student-records/StudentRecordsPage';
import AnnouncementDetailPage from '@pages/shared/announcement-management/AnnouncementDetailPage';
import AnnouncementManagement from '@pages/shared/announcement-management';
import EventDetailPage from '@pages/shared/event-management/EventDetailPage';
import EventManagement from '@pages/shared/event-management';
import ProfilePage from '@pages/shared/profile';
import { RouteObject } from 'react-router-dom';

export const registrarRoutes: RouteObject[] = [
    {
        element: <RegistrarLayout />,
        path: 'registrar',
        children: [
            { element: <RegistrarDashboard />, index: true },
            { element: <StudentManagement />, path: 'student-management' },
            { element: <StudentRecordsPage />, path: 'student-management/:studentId/records' },
            { element: <EnrollmentManagement />, path: 'enrollment-management' },
            { element: <BatchProgression />, path: 'batch-progression' },
            { element: <GradeRelease />, path: 'grade-release' },
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