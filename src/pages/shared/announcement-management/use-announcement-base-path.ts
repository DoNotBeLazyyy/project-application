import { useLocation } from 'react-router-dom';

export function useAnnouncementBasePath(): string {
    const { pathname } = useLocation();
    const roleSegment = pathname.split('/')[1] || 'admin';

    return `/${roleSegment}/announcement-management`;
}