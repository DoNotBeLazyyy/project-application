import { callRpc } from '@services/supabase.wrapper';
import { DiscussionThreadDetail, DiscussionThreadRow } from '@type/discussion.type';
import { CommonListResDto, SortStringDto } from '@type/http.type';
import { ServiceResult } from '@type/service.type';

export async function listSectionThreads(
    sectionId: string,
    page: number,
    size: number,
    search: string,
    sort: SortStringDto[]
): Promise<ServiceResult<CommonListResDto<DiscussionThreadRow>>> {
    return callRpc<CommonListResDto<DiscussionThreadRow>>('fn_list_section_threads_json', {
        p_page: page,
        p_search: search || null,
        p_section_id: sectionId,
        p_size: size,
        p_sort: sort.length > 0
            ? sort
            : null
    });
}

export async function getDiscussionThread(
    threadId: string
): Promise<ServiceResult<DiscussionThreadDetail>> {
    return callRpc<DiscussionThreadDetail>('fn_get_discussion_thread', {
        p_thread_id: threadId
    });
}

export async function createThread(
    sectionId: string,
    title: string,
    body: string
): Promise<ServiceResult<null>> {
    return callRpc<null>('fn_create_thread', {
        p_body: body,
        p_section_id: sectionId,
        p_title: title
    });
}

export async function replyToThread(
    threadId: string,
    body: string
): Promise<ServiceResult<null>> {
    return callRpc<null>('fn_reply_to_thread', {
        p_body: body,
        p_thread_id: threadId
    });
}

export async function deleteThread(
    threadId: string
): Promise<ServiceResult<null>> {
    return callRpc<null>('fn_delete_thread', {
        p_thread_id: threadId
    });
}

export async function deletePost(
    postId: string
): Promise<ServiceResult<null>> {
    return callRpc<null>('fn_delete_post', {
        p_post_id: postId
    });
}

export async function setThreadResolved(
    threadId: string,
    isResolved: boolean
): Promise<ServiceResult<null>> {
    return callRpc<null>('fn_set_thread_resolved', {
        p_is_resolved: isResolved,
        p_thread_id: threadId
    });
}

export async function setPostAnswer(
    postId: string,
    isAnswer: boolean
): Promise<ServiceResult<null>> {
    return callRpc<null>('fn_set_post_answer', {
        p_is_answer: isAnswer,
        p_post_id: postId
    });
}

export async function setThreadPinned(
    threadId: string,
    isPinned: boolean
): Promise<ServiceResult<null>> {
    return callRpc<null>('fn_set_thread_pinned', {
        p_is_pinned: isPinned,
        p_thread_id: threadId
    });
}