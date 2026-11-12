import { deleteFile, uploadFileToFolder } from '@services/storage.service';
import { supabase } from '@services/supabase.client';
import { callRpc, callStorage } from '@services/supabase.wrapper';
import { DiscussionAttachmentPayload, DiscussionThreadDetail, DiscussionThreadRow } from '@type/discussion.type';
import { CommonListResDto, SortStringDto } from '@type/http.type';
import { ServiceResult } from '@type/service.type';
import { parseServiceError } from '@utils/error.util';

const DISCUSSION_BUCKET = 'discussions';

// Discussion files keep their own 25 MB limit
const DISCUSSION_MAX_SIZE_MB = 25;

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

/**
 * Uploads one discussion file under the section's folder.
 *
 * @param sectionId - The section the discussion belongs to.
 * @param file - The chosen file.
 * @returns The attachment details to save with the post.
 */
export async function uploadDiscussionFile(
    sectionId: string,
    file: File
): Promise<ServiceResult<DiscussionAttachmentPayload>> {
    const result = await uploadFileToFolder({
        bucket: DISCUSSION_BUCKET,
        file,
        folder: sectionId,
        maxSizeMb: DISCUSSION_MAX_SIZE_MB
    });

    if (!result.data) {
        return { data: null, error: result.error };
    }

    return {
        data: {
            file_name: result.data.file_name,
            file_path: result.data.file_path,
            file_size: result.data.file_size,
            mime_type: result.data.mime_type
        },
        error: null
    };
}

/**
 * Deletes uploaded discussion files, e.g. when the post could not be saved.
 *
 * @param attachments - The files that were uploaded.
 */
export async function removeDiscussionFiles(
    attachments: DiscussionAttachmentPayload[]
): Promise<void> {
    await Promise.all(attachments.map((attachment) => deleteFile(DISCUSSION_BUCKET, attachment.file_path)));
}

/**
 * Uploads several discussion files. If one fails, the ones already uploaded are deleted.
 *
 * @param sectionId - The section the discussion belongs to.
 * @param files - The chosen files.
 * @returns All uploaded attachments, or the error of the file that failed.
 */
export async function uploadDiscussionFiles(
    sectionId: string,
    files: File[]
): Promise<ServiceResult<DiscussionAttachmentPayload[]>> {
    const uploaded: DiscussionAttachmentPayload[] = [];

    for (const file of files) {
        const result = await uploadDiscussionFile(sectionId, file);

        if (!result.data) {
            await removeDiscussionFiles(uploaded);
            return {
                data: null,
                error: result.error ?? {
                    code: 'UPLOAD_FAILED',
                    message: `"${file.name}" could not be uploaded.`,
                    status: null
                }
            };
        }

        uploaded.push(result.data);
    }

    return { data: uploaded, error: null };
}

export async function getDiscussionFileUrl(
    path: string,
    expiresIn = 3600
): Promise<ServiceResult<string>> {
    return callStorage(async function() {
        const { data, error } = await supabase.storage
            .from(DISCUSSION_BUCKET)
            .createSignedUrl(path, expiresIn);

        if (error) {
            return { data: null, error: parseServiceError(error) };
        }

        return { data: data.signedUrl, error: null };
    }, { background: true });
}

export async function createThread(
    sectionId: string,
    title: string,
    body: string,
    attachments: DiscussionAttachmentPayload[] = []
): Promise<ServiceResult<null>> {
    return callRpc<null>('fn_create_thread', {
        p_attachments: attachments,
        p_body: body,
        p_section_id: sectionId,
        p_title: title
    });
}

export async function replyToThread(
    threadId: string,
    body: string,
    attachments: DiscussionAttachmentPayload[] = []
): Promise<ServiceResult<null>> {
    return callRpc<null>('fn_reply_to_thread', {
        p_attachments: attachments,
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