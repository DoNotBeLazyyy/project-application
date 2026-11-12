import { callRpc, CallRpcOptions } from '@services/supabase.wrapper';
import {
    AnnouncementDetail,
    AnnouncementFeedRow,
    AnnouncementFormValues,
    AnnouncementListRow,
    AnnouncementSectionOption,
    CommunicationItemType,
    ConvertedCommunicationItem
} from '@type/announcement.type';
import { EventFormValues } from '@type/event.type';
import { CommonListResDto, SortStringDto } from '@type/http.type';
import { ServiceResult } from '@type/service.type';
import { sanitizeUuidArray } from '@utils/uuid.util';

export async function listAnnouncements(
    page: number,
    size: number,
    search: string,
    sort: SortStringDto[],
    audience: string | null,
    isPinned: boolean | null,
    role?: string | null
): Promise<ServiceResult<CommonListResDto<AnnouncementListRow>>> {
    return callRpc<CommonListResDto<AnnouncementListRow>>('fn_list_announcements_json', {
        p_audience: audience || null,
        p_is_pinned: isPinned,
        p_mine_only: false,
        p_page: page,
        p_role: role || null,
        p_search: search || null,
        p_size: size,
        p_sort: sort.length > 0
            ? sort
            : null
    });
}

export async function listMyAnnouncementsFeed(
    page: number,
    size: number,
    search: string,
    role?: string | null
): Promise<ServiceResult<CommonListResDto<AnnouncementFeedRow>>> {
    return callRpc<CommonListResDto<AnnouncementFeedRow>>('fn_list_my_announcements_feed', {
        p_page: page,
        p_role: role || null,
        p_search: search || null,
        p_size: size
    }, { background: true, silent: true });
}

export async function listSectionAnnouncements(
    sectionId: string,
    page = 1,
    size = 20
): Promise<ServiceResult<CommonListResDto<AnnouncementFeedRow>>> {
    return callRpc<CommonListResDto<AnnouncementFeedRow>>('fn_list_section_announcements', {
        p_page: page,
        p_section_id: sectionId,
        p_size: size
    });
}

export async function getAnnouncementById(
    announcementId: string,
    options?: CallRpcOptions
): Promise<ServiceResult<AnnouncementDetail>> {
    return callRpc<AnnouncementDetail>('fn_get_announcement_by_id', {
        p_id: announcementId
    }, options);
}

export async function getAnnouncementSectionOptions(): Promise<ServiceResult<AnnouncementSectionOption[]>> {
    return callRpc<AnnouncementSectionOption[]>('fn_get_announcement_section_options');
}

export async function createAnnouncement(
    params: AnnouncementFormValues,
    role?: string | null
): Promise<ServiceResult<null>> {
    return callRpc<null>('fn_create_announcement', {
        p_attachments: params.attachments && params.attachments.length > 0
            ? params.attachments
            : null,
        p_audience: params.target_audience,
        p_content: params.content,
        p_expires_at: params.expires_at || null,
        p_is_pinned: params.is_pinned,
        p_role: role || null,
        p_section_ids: params.target_audience === 'Section'
            ? sanitizeUuidArray(params.section_ids)
            : null,
        p_title: params.title
    });
}

export async function updateAnnouncement(
    announcementId: string,
    params: AnnouncementFormValues
): Promise<ServiceResult<null>> {
    return callRpc<null>('fn_update_announcement', {
        // An empty array clears existing attachments; null leaves them untouched.
        p_attachments: params.attachments ?? null,
        p_audience: params.target_audience,
        p_content: params.content,
        p_expires_at: params.expires_at || null,
        p_id: announcementId,
        p_is_pinned: params.is_pinned,
        p_section_ids: params.target_audience === 'Section'
            ? sanitizeUuidArray(params.section_ids)
            : null,
        p_title: params.title
    });
}

/**
 * Turns an announcement into an event, or an event into an announcement, in one server
 * call. The new item keeps the old one's notifications, sections and attachments, and the
 * old item is removed. Nothing changes when any step fails.
 *
 * @param id - The item being converted.
 * @param fromType - What the item is now.
 * @param values - The form values for the new item.
 * @param role - The signed-in role.
 * @returns The new item's id.
 */
export async function convertCommunicationItem(
    id: string,
    fromType: CommunicationItemType,
    values: AnnouncementFormValues | EventFormValues,
    role?: string | null
): Promise<ServiceResult<ConvertedCommunicationItem>> {
    const audience = values.target_audience || 'Global';
    const eventValues = values as Partial<EventFormValues>;
    const announcementValues = values as Partial<AnnouncementFormValues>;

    return callRpc<ConvertedCommunicationItem>('fn_convert_communication_item', {
        p_from_type: fromType,
        p_id: id,
        p_payload: {
            all_day: eventValues.all_day ?? false,
            // Left out, the server keeps the original's attachments
            attachments: values.attachments ?? null,
            audience,
            content: announcementValues.content ?? null,
            description: eventValues.description || null,
            end_at: eventValues.end_at || null,
            expires_at: announcementValues.expires_at || null,
            is_pinned: announcementValues.is_pinned ?? false,
            location: eventValues.location || null,
            section_ids: audience === 'Section'
                ? sanitizeUuidArray(values.section_ids)
                : null,
            start_at: eventValues.start_at || null,
            title: values.title
        },
        p_role: role || null
    });
}

export async function deleteAnnouncement(
    announcementId: string
): Promise<ServiceResult<null>> {
    return callRpc<null>('fn_delete_announcement', {
        p_id: announcementId
    });
}

export async function bulkDeleteAnnouncements(
    announcementIds: string[]
): Promise<ServiceResult<null>> {
    return callRpc<null>('fn_bulk_delete_announcements', {
        p_ids: announcementIds
    });
}