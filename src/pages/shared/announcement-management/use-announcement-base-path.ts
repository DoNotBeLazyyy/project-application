import { useAppStore } from '@stores/app.store';
import { useLocation } from 'react-router-dom';

/**
 * List page for the signed-in role, for example "/dean/announcement-management".
 * Uses the active role; the URL is only a fallback while the role is still loading.
 */
export function useAnnouncementBasePath(): string {
    const { pathname } = useLocation();
    const activeRole = useAppStore((s) => s.activeRole);
    const roleSegment = activeRole
        ? activeRole.toLowerCase()
        : pathname.split('/')[1] || 'admin';

    return `/${roleSegment}/announcement-management`;
}