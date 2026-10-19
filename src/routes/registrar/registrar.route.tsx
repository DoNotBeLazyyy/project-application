import { lazyElement } from '@utils/lazy.util';
import { Navigate, RouteObject } from 'react-router-dom';

export const registrarRoutes: RouteObject[] = [
    {
        element: lazyElement(function() {
            return import('@pages/registrar/RegistrarLayout');
        }),
        path: 'registrar',
        children: [
            {
                element: lazyElement(function() {
                    return import('@pages/registrar/RegistrarDashboard');
                }),
                index: true
            },
            {
                element: lazyElement(function() {
                    return import('@pages/registrar/enrollment-management');
                }),
                path: 'enrollment-management'
            },
            {
                element: lazyElement(function() {
                    return import('@pages/registrar/grade-release-management');
                }),
                path: 'grade-release'
            },
            {
                element: lazyElement(function() {
                    return import('@pages/registrar/student-verification');
                }),
                path: 'student-verification'
            },
            {
                element: lazyElement(function() {
                    return import('@pages/registrar/registrar-logs');
                }),
                path: 'registrar-logs'
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
                element: <Navigate replace to="/registrar/announcement-management" />,
                path: 'event-management'
            },
            {
                element: <Navigate replace to="/registrar/announcement-management/new?type=Event" />,
                path: 'event-management/new'
            },
            {
                element: <Navigate replace to="/registrar/announcement-management" />,
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