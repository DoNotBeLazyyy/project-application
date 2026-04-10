import ComponentSample from '@pages/component-sample';
import ModalSamplePage from '@pages/component-sample/modal';
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

            element: <ModalSamplePage />,
            path: 'modal'
        }
    ]
}] as const;