import { ROLE_HOME } from '@constants/role.constant';
import { UserRole } from '@type/app.type';

const NOTIFICATION_SEGMENT_ALIASES: Record<string, string> = {
    announcements: 'announcement-management',
    'announcement-management': 'announcement-management',
    events: 'event-management',
    'event-management': 'event-management'
};

const ROLES_WITH_CONTENT_ROUTES: UserRole[] = ['Admin', 'Dean', 'Faculty', 'Registrar'];

function isRoleHomeSegment(segment: string): boolean {
    return Object.values(ROLE_HOME)
        .some((home) => home === `/${segment}`);
}

export function resolveNotificationPath(
    actionUrl: string | null,
    activeRole: UserRole | null
): string | null {
    if (!actionUrl || !activeRole) {
        return null;
    }

    const cleanUrl = actionUrl.replace(/\\/g, '/');
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