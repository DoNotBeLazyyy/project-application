import { callRpc } from '@services/supabase.wrapper';
import {
    AnnouncementDetail,
    AnnouncementFeedRow,
    AnnouncementFormValues,
    AnnouncementListRow,
    AnnouncementSectionOption
} from '@type/announcement.type';
import { CommonListResDto, SortStringDto } from '@type/http.type';
import { ServiceResult } from '@type/service.type';
import { sanitizeUuidArray } from '@utils/uuid.util';

export async function listAnnouncements(
    page: number,
    size: number,
    search: string,
    sort: SortStringDto[],
    audience: string | null,
    isPinned: boolean | null
): Promise<ServiceResult<CommonListResDto<AnnouncementListRow>>> {
    return callRpc<CommonListResDto<AnnouncementListRow>>('fn_list_announcements_json', {
        p_audience: audience || null,
        p_is_pinned: isPinned,
        p_mine_only: true,
        p_page: page,
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
    search: string
): Promise<ServiceResult<CommonListResDto<AnnouncementFeedRow>>> {
    return callRpc<CommonListResDto<AnnouncementFeedRow>>('fn_list_my_announcements_feed', {
        p_page: page,
        p_search: search || null,
        p_size: size
    });
}

export async function getAnnouncementById(
    announcementId: string
): Promise<ServiceResult<AnnouncementDetail>> {
    return callRpc<AnnouncementDetail>('fn_get_announcement_by_id', {
        p_id: announcementId
    });
}

export async function getAnnouncementSectionOptions(): Promise<ServiceResult<AnnouncementSectionOption[]>> {
    return callRpc<AnnouncementSectionOption[]>('fn_get_announcement_section_options');
}

export async function createAnnouncement(
    params: AnnouncementFormValues
): Promise<ServiceResult<null>> {
    return callRpc<null>('fn_create_announcement', {
        p_audience: params.target_audience,
        p_content: params.content,
        p_expires_at: params.expires_at || null,
        p_is_pinned: params.is_pinned,
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