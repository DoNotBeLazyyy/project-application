import SystemRoot from '@pages/system';
import { accessControlRoutes } from '@routes/system/access-control/access-control.route';
import { countryConfigurationRoutes } from '@routes/system/country-configuration/country-configuration.route';
import { dataManagementRoutes } from '@routes/system/data-management/data-management.route';
import { organizationManagementRoutes } from '@routes/system/organization-management/organization-management.route';
import { RouteObject } from 'react-router-dom';

/**
 * System routing module.
 * Contains all routes for system-level configuration and data management.
 */
export const systemRoutes: RouteObject[] = [{
    element: <SystemRoot />,
    path: 'system',
    children: [
        ...organizationManagementRoutes,
        ...dataManagementRoutes,
        ...accessControlRoutes,
        ...countryConfigurationRoutes
    ]
}]; // System domain routing configuration