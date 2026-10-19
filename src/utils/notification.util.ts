import { ROLE_HOME } from '@constants/role.constant';
import { UserRole } from '@type/app.type';

const NOTIFICATION_SEGMENT_ALIASES: Record<string, string> = {
    announcements: 'announcement-management',
    'announcement-management': 'announcement-management',
    events: 'announcement-management',
    'event-management': 'announcement-management'
};

const ROLES_WITH_CONTENT_ROUTES: UserRole[] = ['Admin', 'Dean', 'Faculty', 'Registrar'];

function isRoleHomeSegment(segment: string): boolean {
    return Object.values(ROLE_HOME)
        .some((home) => home === `/${segment}`);
}

export function resolveNotificationPath(
    actionUrl: string | null,
    activeRole: UserRole | null,
    notificationType?: string | null
): string | null {
    if (!actionUrl || !activeRole) {
        return null;
    }

    let cleanUrl = actionUrl.replace(/\\/g, '/');

    // Faculty routing normalizations
    if (activeRole === 'Faculty') {
        if (cleanUrl.startsWith('/faculty/subjects/')) {
            cleanUrl = cleanUrl.replace('/faculty/subjects/', '/faculty/sections/');
        }

        // Deep link into assessment submissions page if hitting specific assessment without subpath
        if (/^\/faculty\/sections\/[^/]+\/assessments\/[^/?]+$/.test(cleanUrl)) {
            cleanUrl = `${cleanUrl}/submissions`;
        } else if (/^\/faculty\/sections\/[^/?]+$/.test(cleanUrl) && notificationType === 'Assessment') {
            cleanUrl = `${cleanUrl}?tab=assessments`;
        }
    }

    // Student routing normalizations
    if (activeRole === 'Student') {
        if (cleanUrl.startsWith('/student/sections/')) {
            cleanUrl = cleanUrl.replace('/student/sections/', '/student/subjects/');
        }
        if (cleanUrl.startsWith('/faculty/sections/')) {
            cleanUrl = cleanUrl.replace('/faculty/sections/', '/student/subjects/');
        }
    }

    const segments = cleanUrl.split('/')
        .filter(Boolean);

    if (segments.length === 0) {
        return null;
    }

    let announcementId: string | null = null;
    let eventId: string | null = null;

    if (segments[0] === 'announcements' || segments[0] === 'announcement-management') {
        announcementId = segments[1] || null;
    } else if (
        segments.length >= 3 &&
        isRoleHomeSegment(segments[0]) &&
        (segments[1] === 'announcements' || segments[1] === 'announcement-management')
    ) {
        announcementId = segments[2] || null;
    }

    if (segments[0] === 'events' || segments[0] === 'event-management') {
        eventId = segments[1] || null;
    } else if (
        segments.length >= 3 &&
        isRoleHomeSegment(segments[0]) &&
        (segments[1] === 'events' || segments[1] === 'event-management')
    ) {
        eventId = segments[2] || null;
    }

    if (announcementId) {
        return `?announcementId=${announcementId}`;
    }

    if (eventId) {
        return `?eventId=${eventId}`;
    }

    const firstSegment = segments[0];

    if (isRoleHomeSegment(firstSegment)) {
        return cleanUrl;
    }

    const alias = NOTIFICATION_SEGMENT_ALIASES[firstSegment];

    if (!alias) {
        return cleanUrl;
    }

    if (!ROLES_WITH_CONTENT_ROUTES.includes(activeRole)) {
        return ROLE_HOME[activeRole];
    }

    return [ROLE_HOME[activeRole], alias, ...segments.slice(1)].join('/');
}