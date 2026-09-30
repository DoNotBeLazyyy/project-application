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
    attachment_count?: number;
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

export type CommunicationItemType = 'Announcement' | 'Event';

export interface CommunicationFormValues {
    all_day?: boolean;
    attachments?: AttachmentInputDto[];
    author_name?: string;
    content: string;
    created_at?: string;
    description: string;
    end_at: string;
    expires_at: string;
    id?: string;
    is_pinned: boolean;
    item_type: CommunicationItemType;
    location: string;
    posted_on?: string;
    section_ids: string[];
    sections?: AnnouncementSectionRef[];
    start_at: string;
    target_audience: AnnouncementAudience;
    title: string;
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
    attachment_count?: number;
    attachments?: AttachmentInputDto[];
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
    type: 'All' | CommunicationItemType;
}

export interface CommunicationListRow {
    attachment_count?: number;
    author_name: string | null;
    content: string;
    created_at: string;
    date: string;
    end_at?: string;
    id: string;
    is_pinned?: boolean;
    item_type: CommunicationItemType;
    location?: string | null;
    section_count: number;
    start_at?: string;
    target_audience: AnnouncementAudience;
    title: string;
    total_count: number;
}