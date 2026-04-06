import BasePage from '@pages/BasePage';
import { componentSampleRoutes } from '@router/component-sample/component-sample.route';
import { systemRoutes } from '@router/system/system.route';
import { createBrowserRouter } from 'react-router-dom';

const appRouter = createBrowserRouter([
    {
        element: <BasePage />,
        path: '/',
        children: [
            ...componentSampleRoutes,
            ...systemRoutes
        ]
    }
] as const);

export default appRouter;