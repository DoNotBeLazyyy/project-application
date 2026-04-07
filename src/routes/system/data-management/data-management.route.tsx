import SystemDataManagement from '@pages/system/data-management';
import SystemDeductionTypes from '@pages/system/data-management/deduction-type';
import SystemEarningTypes from '@pages/system/data-management/earning-type';
import SystemEarningTypeConditions from '@pages/system/data-management/earning-type-condition';
import SystemHolidays from '@pages/system/data-management/holiday';
import SystemLeaveTypes from '@pages/system/data-management/leave-type';
import SystemWeeklyShifts from '@pages/system/data-management/weekly-shift';
import { RouteObject } from 'react-router-dom';

/**
 * System routing module.
 * Contains all routes for system-level configuration and data management.
 */
export const dataManagementRoutes: RouteObject[] = [{
    element: <SystemDataManagement />,
    path: 'data-management',
    children: [
        {
            path: 'holidays',
            element: <SystemHolidays />
        },
        {
            path: 'deduction-types',
            element: <SystemDeductionTypes />
        },
        {
            path: 'earning-types',
            element: <SystemEarningTypes />
        },
        {
            path: 'earning-type-conditions',
            element: <SystemEarningTypeConditions />
        },
        {
            path: 'leave-types',
            element: <SystemLeaveTypes />
        },
        {
            path: 'weekly-shifts',
            element: <SystemWeeklyShifts />
        }
    ]
}]; // System domain routing configuration