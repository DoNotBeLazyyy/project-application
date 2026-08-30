import { AnnouncementAudience, AnnouncementSectionRef, AttachmentInputDto } from '@type/announcement.type';

export interface EventAttachment {
    id: string;
    file_name: string;
    file_path: string;
    mime_type: string | null;
    file_size: number | null;
}

export interface EventListRow {
    id: string;
    title: string;
    description: string | null;
    location: string | null;
    target_audience: AnnouncementAudience;
    start_at: string;
    end_at: string | null;
    all_day: boolean;
    created_at: string;
    created_by: string | null;
    author_name: string | null;
    section_count: number;
    total_count: number;
}

export interface EventDetail {
    id: string;
    title: string;
    description: string | null;
    location: string | null;
    target_audience: AnnouncementAudience;
    start_at: string;
    end_at: string | null;
    all_day: boolean;
    created_at: string;
    created_by: string | null;
    author_name: string | null;
    section_ids: string[];
    sections: AnnouncementSectionRef[];
    attachments: EventAttachment[];
}

export interface EventFormValues {
    title: string;
    section_ids: string[];
    location: string;
    start_at: string;
    end_at: string;
    description: string;
    attachments?: AttachmentInputDto[];
}

export interface EventFeedRow {
    id: string;
    title: string;
    description: string | null;
    location: string | null;
    target_audience: AnnouncementAudience;
    start_at: string;
    end_at: string | null;
    all_day: boolean;
}

export interface EventFilterValues {
    audience: 'All' | AnnouncementAudience;
    upcoming_only: 'All' | 'true';
}