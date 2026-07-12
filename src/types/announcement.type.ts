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
}

export interface AnnouncementFormValues {
    title: string;
    content: string;
    target_audience: AnnouncementAudience;
    section_ids: string[];
    is_pinned: boolean;
    expires_at: string;
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