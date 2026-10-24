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
        colorClass: 'text-amber-700 dark:text-amber-300',
        backgroundClass: 'bg-amber-100 dark:bg-amber-950/60'
    },
    Event: {
        icon: CalendarDotsIcon,
        label: 'Event',
        colorClass: 'text-violet-700 dark:text-violet-300',
        backgroundClass: 'bg-violet-100 dark:bg-violet-950/60'
    },
    Assessment: {
        icon: ClipboardTextIcon,
        label: 'Assessment',
        colorClass: 'text-blue-700 dark:text-blue-300',
        backgroundClass: 'bg-blue-100 dark:bg-blue-950/60'
    },
    Grade: {
        icon: GraduationCapIcon,
        label: 'Grade',
        colorClass: 'text-emerald-700 dark:text-emerald-300',
        backgroundClass: 'bg-emerald-100 dark:bg-emerald-950/60'
    },
    Enrollment: {
        icon: UserPlusIcon,
        label: 'Enrollment',
        colorClass: 'text-cyan-700 dark:text-cyan-300',
        backgroundClass: 'bg-cyan-100 dark:bg-cyan-950/60'
    },
    Clearance: {
        icon: SealCheckIcon,
        label: 'Clearance',
        colorClass: 'text-teal-700 dark:text-teal-300',
        backgroundClass: 'bg-teal-100 dark:bg-teal-950/60'
    },
    Attendance: {
        icon: CalendarCheckIcon,
        label: 'Attendance',
        colorClass: 'text-orange-700 dark:text-orange-300',
        backgroundClass: 'bg-orange-100 dark:bg-orange-950/60'
    },
    Account: {
        icon: UserCircleIcon,
        label: 'Account',
        colorClass: 'text-slate-700 dark:text-slate-300',
        backgroundClass: 'bg-slate-100 dark:bg-slate-800'
    },
    General: {
        icon: BellIcon,
        label: 'Notification',
        colorClass: 'text-slate-700 dark:text-slate-300',
        backgroundClass: 'bg-slate-100 dark:bg-slate-800'
    }
};

export function resolveNotificationVisual(category: NotificationCategory | null): NotificationVisualProps {
    return NOTIFICATION_VISUALS[category ?? 'General'] ?? NOTIFICATION_VISUALS.General;
}