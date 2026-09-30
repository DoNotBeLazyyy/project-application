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

    const firstSegment = segments[0];

    if (firstSegment === 'announcements' || firstSegment === 'announcement-management') {
        const id = segments[1];
        const homePath = ROLE_HOME[activeRole];
        return id ? `${homePath}?announcementId=${id}` : homePath;
    }

    if (firstSegment === 'events' || firstSegment === 'event-management') {
        const id = segments[1];
        const homePath = ROLE_HOME[activeRole];
        return id ? `${homePath}?eventId=${id}` : homePath;
    }

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