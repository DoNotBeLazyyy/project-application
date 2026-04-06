import SystemOrganizationManagement from '@pages/system/organization-management';
import SystemCompanies from '@pages/system/organization-management/company';
import SystemCountries from '@pages/system/organization-management/country';
import SystemDepartments from '@pages/system/organization-management/department';
import SystemDesignations from '@pages/system/organization-management/designation';
import { RouteObject } from 'react-router-dom';

/**
 * System routing module.
 * Contains all routes for system-level configuration and data management.
 */
export const organizationManagementRoutes: RouteObject[] = [{
    element: <SystemOrganizationManagement />,
    path: 'organization-management',
    children: [
        {
            path: 'countries',
            element: <SystemCountries />
        },
        {
            path: 'companies',
            element: <SystemCompanies />
        },
        {
            path: 'departments',
            element: <SystemDepartments />
        },
        {
            path: 'designations',
            element: <SystemDesignations />
        }
    ]
}]; // System domain routing configuration