import CommunicationRedirect from '@pages/shared/announcement-management/CommunicationRedirect';
import { lazyElement } from '@utils/lazy.util';
import { Navigate, RouteObject } from 'react-router-dom';

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
                    return import('@pages/student/grade-report');
                }),
                path: 'grade-report'
            },
            {
                element: <Navigate
                    replace
                    to="/student/grade-report"
                />,
                path: 'transcript'
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
            },
            {
                element: lazyElement(function() {
                    return import('@pages/shared/calendar/CalendarPage');
                }),
                path: 'calendar'
            },
            {
                element: lazyElement(function() {
                    return import('@pages/shared/announcement-management');
                }),
                path: 'announcement-management'
            },
            {
                element: <CommunicationRedirect
                    basePath="/student/announcement-management"
                    itemType="Announcement"
                />,
                path: 'announcement-management/:id'
            },
            {
                element: lazyElement(function() {
                    return import('@pages/shared/announcement-management');
                }),
                path: 'announcements'
            },
            {
                element: <CommunicationRedirect
                    basePath="/student/announcement-management"
                    itemType="Announcement"
                />,
                path: 'announcements/:id'
            },
            {
                element: <Navigate
                    replace
                    to="/student/announcement-management"
                />,
                path: 'event-management'
            },
            {
                element: <CommunicationRedirect
                    basePath="/student/announcement-management"
                    itemType="Event"
                />,
                path: 'event-management/:id'
            }
        ]
    }
];