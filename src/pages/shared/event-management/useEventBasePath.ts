import { useLocation } from 'react-router-dom';

export function useEventBasePath(): string {
    const { pathname } = useLocation();
    const roleSegment = pathname.split('/')[1] || 'admin';

    return `/${roleSegment}/event-management`;
}