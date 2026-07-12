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
    posts: DiscussionPost[];
}