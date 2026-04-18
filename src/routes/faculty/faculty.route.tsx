import FacultyDashboard from '@pages/faculty/FacultyDashboard';
import FacultyLayout from '@pages/faculty/FacultyLayout';
import FacultySectionManagement from '@pages/faculty/sections';
import AssessmentBuilderPage from '@pages/faculty/sections/assessments/builder/AssessmentBuilderPage';
import SubmissionsPage from '@pages/faculty/sections/assessments/submissions/SubmissionsPage';
import SectionDetailPage from '@pages/faculty/sections/SectionDetailPage';
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
            { element: <SubmissionsPage />, path: 'sections/:sectionId/assessments/:assessmentId/submissions' }
        ]
    }
];