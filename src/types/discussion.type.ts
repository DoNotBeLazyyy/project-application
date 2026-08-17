export interface DiscussionAttachment {
    id: string;
    file_name: string;
    file_path: string;
    mime_type: string | null;
    file_size: number | null;
}

export interface DiscussionAttachmentPayload {
    file_name: string;
    file_path: string;
    mime_type: string | null;
    file_size: number | null;
}

export interface DiscussionThreadRow {
    id: string;
    title: string;
    body: string;
    is_resolved: boolean;
    is_pinned: boolean;
    created_at: string;
    created_by: string | null;
    author_name: string | null;
    reply_count: number;
    total_count: number;
}

export interface DiscussionPost {
    id: string;
    body: string;
    is_answer: boolean;
    created_at: string;
    created_by: string | null;
    author_name: string | null;
    attachments: DiscussionAttachment[];
}

export interface DiscussionThreadDetail {
    id: string;
    section_id: string;
    title: string;
    body: string;
    is_resolved: boolean;
    is_pinned: boolean;
    created_at: string;
    created_by: string | null;
    author_name: string | null;
    can_moderate: boolean;
    attachments: DiscussionAttachment[];
    posts: DiscussionPost[];
}