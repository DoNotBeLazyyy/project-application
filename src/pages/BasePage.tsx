import PageLoadingFallback from '@components/loading/PageLoadingFallback';
import { Suspense } from 'react';
import { Outlet } from 'react-router-dom';

export default function BasePage() {
    return (
        <div className="flex h-dvh w-full">
            <Suspense fallback={<PageLoadingFallback />}>
                <Outlet />
            </Suspense>
        </div>
    );
}