import CommunicationRedirect from '@pages/shared/announcement-management/CommunicationRedirect';
import { lazyElement } from '@utils/lazy.util';
import { Navigate, RouteObject } from 'react-router-dom';

export const deanRoutes: RouteObject[] = [
    {
        element: lazyElement(function() {
            return import('@pages/dean/DeanLayout');
        }),
        path: 'dean',
        children: [
            {
                element: lazyElement(function() {
                    return import('@pages/dean/DeanDashboard');
                }),
                index: true
            },
            {
                element: <Navigate
                    replace
                    to="/admin/departments"
                />,
                path: 'department-management'
            },
            {
                element: <Navigate
                    replace
                    to="/admin/departments"
                />,
                path: 'departments'
            },
            {
                element: lazyElement(function() {
                    return import('@pages/dean/program-management/level');
                }),
                path: 'program-level-management'
            },
            {
                element: lazyElement(function() {
                    return import('@pages/dean/course-management/type');
                }),
                path: 'course-type-management'
            },
            {
                element: lazyElement(function() {
                    return import('@pages/dean/program-management');
                }),
                path: 'program-management'
            },
            {
                element: <Navigate
                    replace
                    to="/dean/program-management"
                />,
                path: 'program-management/:programId'
            },
            {
                element: lazyElement(function() {
                    return import('@pages/dean/course-management');
                }),
                path: 'course-management'
            },
            {
                element: <Navigate
                    replace
                    to="/dean/program-management"
                />,
                path: 'curriculum-map-management'
            },
            {
                element: lazyElement(function() {
                    return import('@pages/dean/section-management');
                }),
                path: 'section-management'
            },
            {
                element: lazyElement(function() {
                    return import('@pages/dean/faculty-load');
                }),
                path: 'faculty-load'
            },
            {
                element: lazyElement(function() {
                    return import('@pages/dean/faculty-load/FacultyLoadDetailPage');
                }),
                path: 'faculty-load/:facultyId'
            },
            {
                element: <Navigate
                    replace
                    to="/dean/faculty-load"
                />,
                path: 'schedule-conflicts'
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
                element: <Navigate
                    replace
                    to="/dean/announcement-management"
                />,
                path: 'event-management'
            },
            {
                element: <Navigate
                    replace
                    to="/dean/announcement-management/new?type=Event"
                />,
                path: 'event-management/new'
            },
            {
                element: <CommunicationRedirect
                    basePath="/dean/announcement-management"
                    itemType="Event"
                />,
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