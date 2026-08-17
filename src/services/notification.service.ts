import { callRpc } from '@services/supabase.wrapper';
import { CommonListResDto } from '@type/http.type';
import { NotificationRow } from '@type/notification.type';
import { ServiceResult } from '@type/service.type';

export async function listMyNotifications(
    page: number,
    size: number,
    unreadOnly: boolean
): Promise<ServiceResult<CommonListResDto<NotificationRow>>> {
    return callRpc<CommonListResDto<NotificationRow>>('fn_list_my_notifications_json', {
        p_page: page,
        p_size: size,
        p_unread_only: unreadOnly
    }, { background: true });
}

export async function getUnreadNotificationCount(): Promise<ServiceResult<number>> {
    return callRpc<number>('fn_get_unread_notification_count', undefined, {
        background: true,
        silent: true
    });
}

export async function markMyNotificationsRead(
    notificationIds: string[] | null
): Promise<ServiceResult<null>> {
    return callRpc<null>('fn_mark_my_notifications_read', {
        p_notification_ids: notificationIds
    }, { background: true });
}

export async function markMyNotificationsUnread(
    notificationIds: string[]
): Promise<ServiceResult<null>> {
    return callRpc<null>('fn_mark_my_notifications_unread', {
        p_notification_ids: notificationIds
    }, { background: true });
}