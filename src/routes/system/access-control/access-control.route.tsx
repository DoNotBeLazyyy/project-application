import SystemAccessControl from '@pages/system/access-control';
import SystemMenus from '@pages/system/access-control/menu';
import SystemRoleMenus from '@pages/system/access-control/role-menu';
import SystemUsers from '@pages/system/access-control/user';
import { RouteObject } from 'react-router-dom';

/**
 * System routing module.
 * Contains all routes for system-level configuration and data management.
 */
export const accessControlRoutes: RouteObject[] = [{
    element: <SystemAccessControl />,
    path: 'access-control',
    children: [
        {
            path: 'menus',
            element: <SystemMenus />
        },
        {
            path: 'role-menus',
            element: <SystemRoleMenus />
        },
        {
            path: 'users',
            element: <SystemUsers />
        }
    ]
}]; // System domain routing configuration