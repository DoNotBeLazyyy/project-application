import AssessmentResultPage from '@pages/student/assessment/AssessmentResultPage';
import TakeAssessmentPage from '@pages/student/assessment/TakeAssessmentPage';
import StudentCurriculum from '@pages/student/curriculum';
import StudentEvaluations from '@pages/student/evaluation';
import GradeBreakdownPage from '@pages/student/grade/GradeBreakdownPage';
import StudentGrades from '@pages/student/grade';
import StudentInsight from '@pages/student/insight';
import ProfilePage from '@pages/shared/profile';
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
            { element: <GradeBreakdownPage />, path: 'grade/:enrollmentId/:gradingPeriodId' },
            { element: <StudentEvaluations />, path: 'evaluations/:enrollmentId?/:gradingPeriodId?' },
            { element: <StudentCurriculum />, path: 'curriculum' },
            { element: <StudentInsight />, path: 'insight' },
            { element: <ProfilePage />, path: 'profile' }
        ]
    }
];