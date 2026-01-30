import BasePage from '@pages/BasePage';
import HelloWorldPage from '@pages/HelloWorldPage';
import { createBrowserRouter } from 'react-router-dom';

const appRouter = createBrowserRouter([
    {
        element: <BasePage />,
        children: [
            {
                path: '/',
                element: <HelloWorldPage />
            }
        ]
    }
]);

export default appRouter;