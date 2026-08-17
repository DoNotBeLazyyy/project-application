import { callRpc } from '@services/supabase.wrapper';
import { CreateMaterialPayload, MaterialType, SectionContent, TeachingSection } from '@type/content.type';
import { ServiceResult } from '@type/service.type';

export async function listMyTeachingSections(
    excludeSectionId: string
): Promise<ServiceResult<TeachingSection[]>> {
    return callRpc<TeachingSection[]>('fn_list_my_teaching_sections', {
        p_exclude_section_id: excludeSectionId
    });
}

export async function duplicateModuleToSections(
    moduleId: string,
    sectionIds: string[]
): Promise<ServiceResult<null>> {
    return callRpc<null>('fn_duplicate_module_to_sections', {
        p_module_id: moduleId,
        p_section_ids: sectionIds
    });
}

export async function getSectionContent(
    sectionId: string
): Promise<ServiceResult<SectionContent>> {
    return callRpc<SectionContent>('fn_get_section_content', {
        p_section_id: sectionId
    });
}

export async function createModule(
    sectionId: string,
    title: string,
    description: string | null
): Promise<ServiceResult<null>> {
    return callRpc<null>('fn_create_module', {
        p_description: description,
        p_section_id: sectionId,
        p_title: title
    });
}

export async function updateModule(
    moduleId: string,
    title: string,
    description: string | null
): Promise<ServiceResult<null>> {
    return callRpc<null>('fn_update_module', {
        p_description: description,
        p_module_id: moduleId,
        p_title: title
    });
}

export async function deleteModule(
    moduleId: string
): Promise<ServiceResult<null>> {
    return callRpc<null>('fn_delete_module', {
        p_module_id: moduleId
    });
}

export async function setModulePublished(
    moduleId: string,
    isPublished: boolean
): Promise<ServiceResult<null>> {
    return callRpc<null>('fn_set_module_published', {
        p_is_published: isPublished,
        p_module_id: moduleId
    });
}

export async function createMaterial(
    payload: CreateMaterialPayload
): Promise<ServiceResult<null>> {
    return callRpc<null>('fn_create_material', {
        p_description: payload.description ?? null,
        p_external_url: payload.externalUrl ?? null,
        p_file_name: payload.fileName ?? null,
        p_file_size_bytes: payload.fileSizeBytes ?? null,
        p_file_url: payload.fileUrl ?? null,
        p_material_type: payload.materialType,
        p_mime_type: payload.mimeType ?? null,
        p_module_id: payload.moduleId,
        p_title: payload.title
    });
}

export async function updateMaterial(
    materialId: string,
    title: string,
    description: string | null,
    externalUrl: string | null
): Promise<ServiceResult<null>> {
    return callRpc<null>('fn_update_material', {
        p_description: description,
        p_external_url: externalUrl,
        p_material_id: materialId,
        p_title: title
    });
}

export async function deleteMaterial(
    materialId: string
): Promise<ServiceResult<null>> {
    return callRpc<null>('fn_delete_material', {
        p_material_id: materialId
    });
}

export async function setMaterialPublished(
    materialId: string,
    isPublished: boolean
): Promise<ServiceResult<null>> {
    return callRpc<null>('fn_set_material_published', {
        p_is_published: isPublished,
        p_material_id: materialId
    });
}

export async function markMaterialComplete(
    materialId: string,
    isComplete: boolean
): Promise<ServiceResult<null>> {
    return callRpc<null>('fn_mark_material_complete', {
        p_is_complete: isComplete,
        p_material_id: materialId
    }, { background: true });
}

export const MATERIAL_TYPE_OPTIONS: { label: string; value: MaterialType }[] = [
    { label: 'File', value: 'File' },
    { label: 'Link', value: 'Link' },
    { label: 'Video', value: 'Video' },
    { label: 'Document', value: 'Document' },
    { label: 'Slide', value: 'Slide' },
    { label: 'Other', value: 'Other' }
];