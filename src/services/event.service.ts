import { ALL_SECTIONS_VALUE } from '@constants/event.constant';
import { callRpc } from '@services/supabase.wrapper';
import { AnnouncementAudience } from '@type/announcement.type';
import { EventDetail, EventFeedRow, EventFormValues, EventListRow } from '@type/event.type';
import { CommonListResDto, SortStringDto } from '@type/http.type';
import { ServiceResult } from '@type/service.type';
import { nullIfBlank, sanitizeUuidArray } from '@utils/uuid.util';

export async function listEvents(
    page: number,
    size: number,
    search: string,
    sort: SortStringDto[],
    audience: string | null,
    upcomingOnly: boolean
): Promise<ServiceResult<CommonListResDto<EventListRow>>> {
    return callRpc<CommonListResDto<EventListRow>>('fn_list_events_json', {
        p_audience: audience || null,
        p_mine_only: false,
        p_page: page,
        p_search: search || null,
        p_size: size,
        p_sort: sort.length > 0
            ? sort
            : null,
        p_upcoming_only: upcomingOnly
    });
}

export async function listMyEventsFeed(
    from: string,
    to: string
): Promise<ServiceResult<EventFeedRow[]>> {
    return callRpc<EventFeedRow[]>('fn_list_my_events_feed', {
        p_from: from,
        p_to: to
    }, { background: true, silent: true });
}

export async function getEventById(
    eventId: string
): Promise<ServiceResult<EventDetail>> {
    return callRpc<EventDetail>('fn_get_event_by_id', {
        p_id: eventId
    });
}

interface EventAudienceParams {
    audience: AnnouncementAudience;
    sectionIds: string[] | null;
}

function toAudienceParams(sectionIds: string[]): EventAudienceParams {
    if (sectionIds.includes(ALL_SECTIONS_VALUE)) {
        return { audience: 'Global', sectionIds: null };
    }

    return { audience: 'Section', sectionIds: sanitizeUuidArray(sectionIds) };
}

export async function createEvent(
    params: EventFormValues
): Promise<ServiceResult<null>> {
    const audienceParams = toAudienceParams(params.section_ids);

    return callRpc<null>('fn_create_event', {
        p_all_day: false,
        p_attachments: params.attachments && params.attachments.length > 0
            ? params.attachments
            : null,
        p_audience: audienceParams.audience,
        p_description: params.description || null,
        p_end_at: params.end_at || null,
        p_location: params.location || null,
        p_section_ids: audienceParams.sectionIds,
        p_start_at: nullIfBlank(params.start_at),
        p_title: params.title
    });
}

export async function updateEvent(
    eventId: string,
    params: EventFormValues
): Promise<ServiceResult<null>> {
    const audienceParams = toAudienceParams(params.section_ids);

    return callRpc<null>('fn_update_event', {
        p_all_day: false,
        p_attachments: params.attachments && params.attachments.length > 0
            ? params.attachments
            : null,
        p_audience: audienceParams.audience,
        p_description: params.description || null,
        p_end_at: params.end_at || null,
        p_id: eventId,
        p_location: params.location || null,
        p_section_ids: audienceParams.sectionIds,
        p_start_at: nullIfBlank(params.start_at),
        p_title: params.title
    });
}

export async function deleteEvent(
    eventId: string
): Promise<ServiceResult<null>> {
    return callRpc<null>('fn_delete_event', {
        p_id: eventId
    });
}

export async function bulkDeleteEvents(
    eventIds: string[]
): Promise<ServiceResult<null>> {
    return callRpc<null>('fn_bulk_delete_events', {
        p_ids: eventIds
    });
}