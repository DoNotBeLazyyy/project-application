import { lazyElement } from '@utils/lazy.util';
import { RouteObject } from 'react-router-dom';

export const studentRoutes: RouteObject[] = [
    {
        element: lazyElement(function() {
            return import('@pages/student/StudentLayout');
        }),
        path: 'student',
        children: [
            {
                element: lazyElement(function() {
                    return import('@pages/student/StudentDashboard');
                }),
                index: true
            },
            {
                element: lazyElement(function() {
                    return import('@pages/student/schedule');
                }),
                path: 'schedule'
            },
            {
                element: lazyElement(function() {
                    return import('@pages/student/subject');
                }),
                path: 'subjects'
            },
            {
                element: lazyElement(function() {
                    return import('@pages/student/subject/SubjectDetailPage');
                }),
                path: 'subjects/:enrollmentId'
            },
            {
                element: lazyElement(function() {
                    return import('@pages/student/assessment/TakeAssessmentPage');
                }),
                path: 'subjects/:enrollmentId/assessments/:assessmentId'
            },
            {
                element: lazyElement(function() {
                    return import('@pages/student/assessment/AssessmentResultPage');
                }),
                path: 'subjects/:enrollmentId/assessments/:assessmentId/result'
            },
            {
                element: lazyElement(function() {
                    return import('@pages/student/grade');
                }),
                path: 'grade'
            },
            {
                element: lazyElement(function() {
                    return import('@pages/student/grade/GradeBreakdownPage');
                }),
                path: 'grade/:enrollmentId/:gradingPeriodId'
            },
            {
                element: lazyElement(function() {
                    return import('@pages/student/evaluation');
                }),
                path: 'evaluations/:enrollmentId?/:gradingPeriodId?'
            },
            {
                element: lazyElement(function() {
                    return import('@pages/student/curriculum');
                }),
                path: 'curriculum'
            },
            {
                element: lazyElement(function() {
                    return import('@pages/student/insight');
                }),
                path: 'insight'
            },
            {
                element: lazyElement(function() {
                    return import('@pages/shared/profile');
                }),
                path: 'profile'
            }
        ]
    }
];