import {
    BellIcon,
    CalendarCheckIcon,
    CalendarDotsIcon,
    ClipboardTextIcon,
    GraduationCapIcon,
    Icon,
    MegaphoneIcon,
    SealCheckIcon,
    UserCircleIcon,
    UserPlusIcon
} from '@phosphor-icons/react';
import { NotificationCategory } from '@type/notification.type';

export interface NotificationVisualProps {
    icon: Icon;
    label: string;
    colorClass: string;
    backgroundClass: string;
}

export const NOTIFICATION_VISUALS: Record<NotificationCategory, NotificationVisualProps> = {
    Announcement: {
        icon: MegaphoneIcon,
        label: 'Announcement',
        colorClass: 'text-amber-700',
        backgroundClass: 'bg-amber-100'
    },
    Event: {
        icon: CalendarDotsIcon,
        label: 'Event',
        colorClass: 'text-violet-700',
        backgroundClass: 'bg-violet-100'
    },
    Assessment: {
        icon: ClipboardTextIcon,
        label: 'Assessment',
        colorClass: 'text-blue-700',
        backgroundClass: 'bg-blue-100'
    },
    Grade: {
        icon: GraduationCapIcon,
        label: 'Grade',
        colorClass: 'text-emerald-700',
        backgroundClass: 'bg-emerald-100'
    },
    Enrollment: {
        icon: UserPlusIcon,
        label: 'Enrollment',
        colorClass: 'text-cyan-700',
        backgroundClass: 'bg-cyan-100'
    },
    Clearance: {
        icon: SealCheckIcon,
        label: 'Clearance',
        colorClass: 'text-teal-700',
        backgroundClass: 'bg-teal-100'
    },
    Attendance: {
        icon: CalendarCheckIcon,
        label: 'Attendance',
        colorClass: 'text-orange-700',
        backgroundClass: 'bg-orange-100'
    },
    Account: {
        icon: UserCircleIcon,
        label: 'Account',
        colorClass: 'text-slate-700',
        backgroundClass: 'bg-slate-100'
    },
    General: {
        icon: BellIcon,
        label: 'Notification',
        colorClass: 'text-slate-700',
        backgroundClass: 'bg-slate-100'
    }
};

export function resolveNotificationVisual(category: NotificationCategory | null): NotificationVisualProps {
    return NOTIFICATION_VISUALS[category ?? 'General'] ?? NOTIFICATION_VISUALS.General;
}