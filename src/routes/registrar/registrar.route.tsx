import { lazyElement } from '@utils/lazy.util';
import { RouteObject } from 'react-router-dom';

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