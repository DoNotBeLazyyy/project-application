import ComponentSample from '@pages/component-sample';
import CommonButtonSample from '@pages/component-sample/button';
import CommonInputSample from '@pages/component-sample/input';
import CommonTableSample from '@pages/component-sample/table';
import { Navigate, RouteObject } from 'react-router-dom';

// Sample routes
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
            element: <CommonInputSample />,
            path: 'input'
        },
        {
            element: <CommonButtonSample />,
            path: 'button'
        }
    ]
}] as const;