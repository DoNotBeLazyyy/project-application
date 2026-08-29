import { lazyElement } from '@utils/lazy.util';
import { RouteObject } from 'react-router-dom';

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
                    return import('@pages/dean/department-management');
                }),
                path: 'department-management'
            },
            {
                element: lazyElement(function() {
                    return import('@pages/dean/program-management');
                }),
                path: 'program-management'
            },
            {
                element: lazyElement(function() {
                    return import('@pages/dean/course-management');
                }),
                path: 'course-management'
            },
            {
                element: lazyElement(function() {
                    return import('@pages/dean/curriculum-map-management');
                }),
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
                element: lazyElement(function() {
                    return import('@pages/shared/event-management');
                }),
                path: 'event-management'
            },
            {
                element: lazyElement(function() {
                    return import('@pages/shared/event-management/EventDetailPage');
                }),
                path: 'event-management/new'
            },
            {
                element: lazyElement(function() {
                    return import('@pages/shared/event-management/EventDetailPage');
                }),
                path: 'event-management/:id'
            }
        ]
    }
];