import { lazyElement } from '@utils/lazy.util';
import { Navigate, RouteObject } from 'react-router-dom';

export const facultyRoutes: RouteObject[] = [
    {
        element: lazyElement(function() {
            return import('@pages/faculty/FacultyLayout');
        }),
        path: 'faculty',
        children: [
            {
                element: lazyElement(function() {
                    return import('@pages/faculty/FacultyDashboard');
                }),
                index: true
            },
            {
                element: lazyElement(function() {
                    return import('@pages/faculty/sections');
                }),
                path: 'sections'
            },
            {
                element: lazyElement(function() {
                    return import('@pages/faculty/evaluations/FacultyEvaluationsPage');
                }),
                path: 'evaluations'
            },
            {
                element: lazyElement(function() {
                    return import('@pages/faculty/sections/SectionDetailPage');
                }),
                path: 'sections/:sectionId'
            },
            {
                element: lazyElement(function() {
                    return import('@pages/faculty/sections/assessments/submissions/SubmissionsPage');
                }),
                path: 'sections/:sectionId/assessments/:assessmentId/submissions'
            },
            {
                element: lazyElement(function() {
                    return import('@pages/faculty/sections/rubrics/RubricBuilderPage');
                }),
                path: 'sections/:sectionId/rubrics/:rubricId'
            },
            {
                element: lazyElement(function() {
                    return import('@pages/shared/profile');
                }),
                path: 'profile'
            },
            {
                element: lazyElement(function() {
                    return import('@pages/shared/announcement-management');
                }),
                path: 'announcement-management'
            },
            {
                element: lazyElement(function() {
                    return import('@pages/shared/announcement-management/AnnouncementDetailPage');
                }),
                path: 'announcement-management/new'
            },
            {
                element: lazyElement(function() {
                    return import('@pages/shared/announcement-management/AnnouncementDetailPage');
                }),
                path: 'announcement-management/:id'
            },
            {
                element: <Navigate replace to="/faculty/announcement-management" />,
                path: 'event-management'
            },
            {
                element: <Navigate replace to="/faculty/announcement-management/new?type=Event" />,
                path: 'event-management/new'
            },
            {
                element: <Navigate replace to="/faculty/announcement-management" />,
                path: 'event-management/:id'
            },
            {
                element: lazyElement(function() {
                    return import('@pages/shared/calendar/CalendarPage');
                }),
                path: 'calendar'
            }
        ]
    }
];