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

    const segments = actionUrl.split('/')
        .filter(Boolean);

    if (segments.length === 0) {
        return null;
    }

    if (isRoleHomeSegment(segments[0])) {
        return actionUrl;
    }

    const alias = NOTIFICATION_SEGMENT_ALIASES[segments[0]];

    if (!alias) {
        return actionUrl;
    }

    if (!ROLES_WITH_CONTENT_ROUTES.includes(activeRole)) {
        return ROLE_HOME[activeRole];
    }

    return [ROLE_HOME[activeRole], alias, ...segments.slice(1)].join('/');
}