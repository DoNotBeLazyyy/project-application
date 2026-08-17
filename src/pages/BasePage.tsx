import { Outlet } from 'react-router-dom';

export default function BasePage() {
    return (
        <div className="flex h-dvh w-full">
            <Outlet />
        </div>
    );
}