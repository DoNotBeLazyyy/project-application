import FacultyDashboard from '@pages/faculty/FacultyDashboard';
import FacultyLayout from '@pages/faculty/FacultyLayout';
import FacultySectionManagement from '@pages/faculty/sections';
import ItemAnalysisPage from '@pages/faculty/sections/assessments/analysis/ItemAnalysisPage';
import AssessmentBuilderPage from '@pages/faculty/sections/assessments/builder/AssessmentBuilderPage';
import SubmissionsPage from '@pages/faculty/sections/assessments/submissions/SubmissionsPage';
import RubricBuilderPage from '@pages/faculty/sections/rubrics/RubricBuilderPage';
import SectionDetailPage from '@pages/faculty/sections/SectionDetailPage';
import AnnouncementDetailPage from '@pages/shared/announcement-management/AnnouncementDetailPage';
import AnnouncementManagement from '@pages/shared/announcement-management';
import EventDetailPage from '@pages/shared/event-management/EventDetailPage';
import EventManagement from '@pages/shared/event-management';
import ProfilePage from '@pages/shared/profile';
import { RouteObject } from 'react-router-dom';

export const facultyRoutes: RouteObject[] = [
    {
        element: <FacultyLayout />,
        path: 'faculty',
        children: [
            { element: <FacultyDashboard />, index: true },
            { element: <FacultySectionManagement />, path: 'sections' },
            { element: <SectionDetailPage />, path: 'sections/:sectionId' },
            { element: <AssessmentBuilderPage />, path: 'sections/:sectionId/assessments/:assessmentId/builder' },
            { element: <SubmissionsPage />, path: 'sections/:sectionId/assessments/:assessmentId/submissions' },
            { element: <ItemAnalysisPage />, path: 'sections/:sectionId/assessments/:assessmentId/analysis' },
            { element: <RubricBuilderPage />, path: 'sections/:sectionId/rubrics/:rubricId' },
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