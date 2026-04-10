import ComponentSample from '@pages/component-sample';
import CommonCheckboxSample from '@pages/component-sample/checkbox';
import CommonRadioSample from '@pages/component-sample/radio';
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
            element: <CommonRadioSample />,
            path: 'radio'
        },
        {
            element: <CommonCheckboxSample />,
            path: 'checkbox'
        }
    ]
}] as const;