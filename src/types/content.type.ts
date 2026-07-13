export type MaterialType = 'File' | 'Link' | 'Video' | 'Document' | 'Slide' | 'Other';

export interface CourseMaterial {
    id: string;
    title: string;
    description: string | null;
    material_type: MaterialType;
    file_url: string | null;
    external_url: string | null;
    file_name: string | null;
    mime_type: string | null;
    file_size_bytes: number | null;
    sequence: number;
    is_published: boolean;
    available_from: string | null;
    available_until: string | null;
    is_completed: boolean;
}

export interface ContentModule {
    id: string;
    title: string;
    description: string | null;
    sequence: number;
    is_published: boolean;
    material_count: number;
    completed_count: number;
    materials: CourseMaterial[];
}

export interface SectionContent {
    can_manage: boolean;
    modules: ContentModule[];
}

export interface TeachingSection {
    id: string;
    section_code: string;
    course_code: string;
    course_title: string;
    term_label: string;
}

export interface CreateMaterialPayload {
    moduleId: string;
    title: string;
    materialType: MaterialType;
    description?: string | null;
    fileUrl?: string | null;
    externalUrl?: string | null;
    fileName?: string | null;
    mimeType?: string | null;
    fileSizeBytes?: number | null;
}