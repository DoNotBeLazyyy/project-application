export type NotificationCategory =
    | 'Announcement'
    | 'Event'
    | 'Assessment'
    | 'Grade'
    | 'Enrollment'
    | 'Clearance'
    | 'Attendance'
    | 'Account'
    | 'General';

export interface NotificationRow {
    id: string;
    title: string;
    message: string;
    is_read: boolean;
    read_at: string | null;
    action_url: string | null;
    notification_type: NotificationCategory | null;
    created_at: string;
    total_count: number;
}