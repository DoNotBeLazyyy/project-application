import ComponentSample from '@pages/component-sample';
import CommonButtonSample from '@pages/component-sample/button';
import CalendarSample from '@pages/component-sample/calendar';
import CommonCheckboxSample from '@pages/component-sample/checkbox';
import CommonInputSample from '@pages/component-sample/input';
import ModalSamplePage from '@pages/component-sample/modal';
import CommonRadioSample from '@pages/component-sample/radio';
import CommonTabMenuSample from '@pages/component-sample/tab-menu';
import CommonTableSample from '@pages/component-sample/table';
import CommonToggleSample from '@pages/component-sample/toggle-button';
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
        },
        {
            element: <CalendarSample />,
            path: 'calendar'
        },
        {
            element: <CommonRadioSample />,
            path: 'radio'
        },
        {
            element: <CommonCheckboxSample />,
            path: 'checkbox'
        },
        {
            element: <CommonInputSample />,
            path: 'input'
        },
        {
            element: <CommonTabMenuSample />,
            path: 'tab-menu'
        },
        {
            element: <CommonToggleSample />,
            path: 'toggle'
        },
        {
            element: <CommonButtonSample />,
            path: 'button'
        }
    ]
}] as const;