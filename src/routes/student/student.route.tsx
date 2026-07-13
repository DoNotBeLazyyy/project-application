import AssessmentResultPage from '@pages/student/assessment/AssessmentResultPage';
import TakeAssessmentPage from '@pages/student/assessment/TakeAssessmentPage';
import StudentCurriculum from '@pages/student/curriculum';
import StudentGrades from '@pages/student/grade';
import StudentInsight from '@pages/student/insight';
import StudentSchedule from '@pages/student/schedule';
import StudentDashboard from '@pages/student/StudentDashboard';
import StudentLayout from '@pages/student/StudentLayout';
import StudentSubjects from '@pages/student/subject';
import SubjectDetailPage from '@pages/student/subject/SubjectDetailPage';
import { RouteObject } from 'react-router-dom';

export const studentRoutes: RouteObject[] = [
    {
        element: <StudentLayout />,
        path: 'student',
        children: [
            { element: <StudentDashboard />, index: true },
            { element: <StudentSchedule />, path: 'schedule' },
            { element: <StudentSubjects />, path: 'subjects' },
            { element: <SubjectDetailPage />, path: 'subjects/:enrollmentId' },
            { element: <TakeAssessmentPage />, path: 'subjects/:enrollmentId/assessments/:assessmentId' },
            { element: <AssessmentResultPage />, path: 'subjects/:enrollmentId/assessments/:assessmentId/result' },
            { element: <StudentGrades />, path: 'grade' },
            { element: <StudentCurriculum />, path: 'curriculum' },
            { element: <StudentInsight />, path: 'insight' }
        ]
    }
];