import { lazyElement } from '@utils/lazy.util';
import { RouteObject } from 'react-router-dom';

export const adminRoutes: RouteObject[] = [
    {
        element: lazyElement(function() {
            return import('@pages/admin/AdminLayout');
        }),
        path: 'admin',
        children: [
            {
                element: lazyElement(function() {
                    return import('@pages/admin/AdminDashboard');
                }),
                index: true
            },
            {
                element: lazyElement(function() {
                    return import('@pages/admin/user-management');
                }),
                path: 'users'
            },
            {
                element: lazyElement(function() {
                    return import('@pages/admin/school-year-management');
                }),
                path: 'school-years'
            },
            {
                element: lazyElement(function() {
                    return import('@pages/admin/grading-config-management/TransmutationPage');
                }),
                path: 'transmutation'
            },
            {
                element: lazyElement(function() {
                    return import('@pages/admin/grading-config-management/PeriodsPage');
                }),
                path: 'grading-periods'
            },
            {
                element: lazyElement(function() {
                    return import('@pages/admin/grading-config-management/SpecialGradesPage');
                }),
                path: 'special-grades'
            },
            {
                element: lazyElement(function() {
                    return import('@pages/admin/grading-config-management');
                }),
                path: 'grade-configurations'
            },
            {
                element: lazyElement(function() {
                    return import('@pages/admin/grading-config-management');
                }),
                path: 'grading-rules'
            },
            {
                element: lazyElement(function() {
                    return import('@pages/admin/evaluation-management');
                }),
                path: 'evaluations'
            },
            {
                element: lazyElement(function() {
                    return import('@pages/admin/evaluation-management/EvaluationTemplateDetailPage');
                }),
                path: 'evaluations/new'
            },
            {
                element: lazyElement(function() {
                    return import('@pages/admin/evaluation-management/EvaluationTemplateDetailPage');
                }),
                path: 'evaluations/:id'
            },
            {
                element: lazyElement(function() {
                    return import('@pages/admin/role-management');
                }),
                path: 'roles'
            },
            {
                element: lazyElement(function() {
                    return import('@pages/admin/term-management');
                }),
                path: 'terms'
            },
            {
                element: lazyElement(function() {
                    return import('@pages/admin/term-management/type');
                }),
                path: 'term-types'
            },
            {
                element: lazyElement(function() {
                    return import('@pages/admin/academic-threshold-management');
                }),
                path: 'academic-thresholds'
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
            },
            {
                element: lazyElement(function() {
                    return import('@pages/admin/audit-log-management');
                }),
                path: 'audit-logs'
            },
            {
                element: lazyElement(function() {
                    return import('@pages/shared/profile');
                }),
                path: 'profile'
            },
            {
                element: lazyElement(function() {
                    return import('@pages/admin/system-settings-management');
                }),
                path: 'system-settings'
            }
        ]
    }
];