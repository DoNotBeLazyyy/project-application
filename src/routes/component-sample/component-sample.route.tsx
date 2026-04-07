import ComponentSample from '@pages/component-sample';
import PaginationSample from '@pages/component-sample/pagination';
import CommonTableSample from '@pages/component-sample/table';
import { Navigate, RouteObject } from 'react-router-dom';

// Employee routes
export const componentSampleRoutes: readonly RouteObject[] = [{
    element: <ComponentSample />,
    path: 'sample',
    children: [
        {
            index: true,
            element: <Navigate
                replace
                to="table"
            />
        },
        {
            element: <CommonTableSample />,
            path: 'table'
        },
        {
            element: <PaginationSample />,
            path: 'pagination'
        }
    ]
}] as const;