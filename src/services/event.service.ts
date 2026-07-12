import { callRpc } from '@services/supabase.wrapper';
import { EventDetail, EventFeedRow, EventFormValues, EventListRow } from '@type/event.type';
import { CommonListResDto, SortStringDto } from '@type/http.type';
import { ServiceResult } from '@type/service.type';

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
        p_mine_only: true,
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
    });
}

export async function getEventById(
    eventId: string
): Promise<ServiceResult<EventDetail>> {
    return callRpc<EventDetail>('fn_get_event_by_id', {
        p_id: eventId
    });
}

export async function createEvent(
    params: EventFormValues
): Promise<ServiceResult<null>> {
    return callRpc<null>('fn_create_event', {
        p_all_day: false,
        p_audience: params.target_audience,
        p_description: params.description || null,
        p_end_at: params.end_at || null,
        p_location: params.location || null,
        p_section_ids: params.target_audience === 'Section'
            ? params.section_ids
            : null,
        p_start_at: params.start_at,
        p_title: params.title
    });
}

export async function updateEvent(
    eventId: string,
    params: EventFormValues
): Promise<ServiceResult<null>> {
    return callRpc<null>('fn_update_event', {
        p_all_day: false,
        p_audience: params.target_audience,
        p_description: params.description || null,
        p_end_at: params.end_at || null,
        p_id: eventId,
        p_location: params.location || null,
        p_section_ids: params.target_audience === 'Section'
            ? params.section_ids
            : null,
        p_start_at: params.start_at,
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