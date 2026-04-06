import { Outlet } from 'react-router-dom';

export default function BasePage() {
    return (
        <div className="absolute flex h-screen inset-0 w-full">
            <Outlet />
        </div>
    );
}