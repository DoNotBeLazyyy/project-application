export type AnnouncementAudience = 'Global' | 'Faculty' | 'Student' | 'Section';

export interface AnnouncementListRow {
    id: string;
    title: string;
    content: string;
    target_audience: AnnouncementAudience;
    is_pinned: boolean;
    published_at: string | null;
    expires_at: string | null;
    created_at: string;
    created_by: string | null;
    author_name: string | null;
    section_count: number;
    total_count: number;
}

export interface AnnouncementSectionRef {
    id: string;
    code: string;
    course_code: string | null;
}

export interface AnnouncementAttachment {
    id: string;
    file_name: string;
    file_path: string;
    mime_type: string | null;
    file_size: number | null;
}

export interface AttachmentInputDto {
    file_name: string;
    file_path: string;
    mime_type?: string | null;
    file_size?: number | null;
}

export interface AnnouncementDetail {
    id: string;
    title: string;
    content: string;
    target_audience: AnnouncementAudience;
    is_pinned: boolean;
    published_at: string | null;
    expires_at: string | null;
    created_at: string;
    created_by: string | null;
    author_name: string | null;
    section_ids: string[];
    sections: AnnouncementSectionRef[];
    attachments: AnnouncementAttachment[];
}

export interface AnnouncementFormValues {
    author_name?: string;
    content: string;
    expires_at: string;
    is_pinned: boolean;
    posted_on?: string;
    section_ids: string[];
    target_audience: AnnouncementAudience;
    title: string;
    attachments?: AttachmentInputDto[];
    sections?: AnnouncementSectionRef[];
}

export interface AnnouncementFeedRow {
    id: string;
    title: string;
    content: string;
    target_audience: AnnouncementAudience;
    is_pinned: boolean;
    published_at: string | null;
    created_at: string;
    author_name: string | null;
    total_count: number;
}

export interface AnnouncementSectionOption {
    id: string;
    section_code: string;
    label: string;
}

export interface AnnouncementFilterValues {
    audience: 'All' | AnnouncementAudience;
    is_pinned: 'All' | 'true' | 'false';
}