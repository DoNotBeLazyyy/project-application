import SystemCountryConfiguration from '@pages/system/country-configuration';
import SystemHolidayTypes from '@pages/system/country-configuration/holiday-type';
import SystemMandatoryDeductions from '@pages/system/country-configuration/mandatory-deduction';
import { RouteObject } from 'react-router-dom';

/**
 * System routing module.
 * Contains all routes for system-level configuration and data management.
 */
export const countryConfigurationRoutes: RouteObject[] = [{
    element: <SystemCountryConfiguration />,
    path: 'country-configuration',
    children: [
        {
            path: 'mandatory-deductions',
            element: <SystemMandatoryDeductions />
        },
        {
            path: 'holiday-types',
            element: <SystemHolidayTypes />
        }
    ]
}]; // System domain routing configuration