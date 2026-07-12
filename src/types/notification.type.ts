export interface NotificationRow {
    id: string;
    title: string;
    message: string;
    is_read: boolean;
    read_at: string | null;
    action_url: string | null;
    created_at: string;
    total_count: number;
}