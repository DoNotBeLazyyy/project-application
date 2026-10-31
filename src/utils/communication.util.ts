import { AnnouncementAudience } from '@type/announcement.type';

export interface CommunicationOwnershipTarget {
    created_by?: string | null;
    created_by_role?: string | null;
    target_audience?: AnnouncementAudience | null;
}

/**
 * Checks whether the current user has permission to manage (edit/delete)
 * a specific communication item (announcement or event).
 *
 * Rules:
 * - Admin has universal management privileges.
 * - Any creator can manage items they created.
 * - Deans/Registrars can manage institutional notices created by peers within their same office,
 *   except for section-specific notices.
 * - Faculty can only manage items they personally created.
 * - Students cannot manage any items.
 */
export function canManageCommunication(
    item: CommunicationOwnershipTarget,
    currentUserId?: string | null,
    currentRole?: string | null
): boolean {
    if (!currentUserId || !currentRole || currentRole === 'Student') {
        return false;
    }

    if (currentRole === 'Admin') {
        return true;
    }

    if (item.created_by && item.created_by === currentUserId) {
        return true;
    }

    if (
        Boolean(item.created_by_role && (currentRole === 'Dean' || currentRole === 'Registrar') && item.created_by_role === currentRole)
        && item.target_audience !== 'Section'
    ) {
        return true;
    }

    return false;
}