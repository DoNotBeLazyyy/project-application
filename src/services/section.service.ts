import { callRpc } from '@services/supabase.wrapper';
import { BulkImportResult } from '@type/bulk-import.type';
import { CommonListResDto, SortStringDto } from '@type/http.type';
import {
    SectionBulkRow, SectionFilterValues, SectionFormValues, SectionListRow, SectionOption
} from '@type/section.type';
import { ServiceResult } from '@type/service.type';
import { nullIfBlank } from '@utils/uuid.util';

export interface TermOption {
    id: string;
    label: string;
    is_active_academic_year?: boolean;
}

export interface FacultyOption {
    id: string;
    full_name: string;
    role_label: string;
}

export async function listSections(
    page: number,
    size: number,
    search: string,
    sort: SortStringDto[],
    filters: SectionFilterValues | null
): Promise<ServiceResult<CommonListResDto<SectionListRow>>> {
    return callRpc<CommonListResDto<SectionListRow>>('fn_list_sections_json', {
        p_page: page,
        p_search: search || null,
        p_size: size,
        p_sort: sort.length > 0
            ? sort
            : null,
        p_term_ids: filters?.term_ids?.length
            ? filters.term_ids
            : null,
        p_course_ids: filters?.course_ids?.length
            ? filters.course_ids
            : null,
        p_statuses: filters?.statuses?.length
            ? filters.statuses
            : null
    });
}

export async function getSectionById(
    sectionId: string
): Promise<ServiceResult<SectionFormValues>> {
    return callRpc<SectionFormValues>('fn_get_section_by_id', {
        p_section_id: sectionId
    });
}

export async function getSections(): Promise<ServiceResult<SectionOption[]>> {
    return callRpc<SectionOption[]>('fn_get_sections');
}

export async function getTerms(): Promise<ServiceResult<TermOption[]>> {
    return callRpc<TermOption[]>('fn_get_terms');
}

export async function getFacultyOptions(): Promise<ServiceResult<FacultyOption[]>> {
    return callRpc<FacultyOption[]>('fn_get_users_by_roles', {
        p_role_codes: ['Faculty']
    });
}

export async function createSection(
    params: SectionFormValues
): Promise<ServiceResult<null>> {
    const code = params.section_code && params.section_code.trim() !== ''
        ? params.section_code
        : `SEC-${Math.floor(1000 + Math.random() * 9000)}`;

    return callRpc<null>('fn_create_section', {
        p_term_id: nullIfBlank(params.term_id),
        p_course_id: nullIfBlank(params.course_id),
        p_faculty_id: nullIfBlank(params.faculty_id),
        p_section_code: code,
        p_room: params.room || null,
        p_max_slots: Number(params.max_slots),
        p_status: 'Open'
    });
}

export async function updateSection(
    sectionId: string,
    params: SectionFormValues
): Promise<ServiceResult<null>> {
    return callRpc<null>('fn_update_section', {
        p_section_id: sectionId,
        p_term_id: nullIfBlank(params.term_id),
        p_course_id: nullIfBlank(params.course_id),
        p_faculty_id: nullIfBlank(params.faculty_id),
        p_section_code: params.section_code || '',
        p_room: params.room || null,
        p_max_slots: Number(params.max_slots),
        p_status: params.status
    });
}

export async function deleteSection(
    sectionId: string
): Promise<ServiceResult<null>> {
    return callRpc<null>('fn_delete_section', {
        p_section_id: sectionId
    });
}

export async function bulkDeleteSections(
    sectionIds: string[]
): Promise<ServiceResult<null>> {
    return callRpc<null>('fn_bulk_delete_sections', {
        p_section_ids: sectionIds
    });
}

export async function copySectionSetupToSections(
    sourceSectionId: string,
    targetSectionIds: string[]
): Promise<ServiceResult<null>> {
    return callRpc<null>('fn_copy_section_setup_to_sections', {
        p_source_section_id: sourceSectionId,
        p_target_section_ids: targetSectionIds
    });
}

export async function bulkCreateSections(
    sections: SectionBulkRow[]
): Promise<BulkImportResult> {
    const mappedSections = sections.map((row, idx) => {
        const code = row.section_code && row.section_code.trim() !== ''
            ? row.section_code
            : `${row.course_code ? row.course_code.trim().toUpperCase().replace(/[^A-Z0-9]/g, '') : 'SEC'}-${Math.floor(100 + Math.random() * 900)}${idx + 1}`;
        return {
            ...row,
            section_code: code
        };
    });

    const result = await callRpc<{
        provisioned_count: number;
        errors: { row: number; code: string; message: string }[];
    }>('fn_bulk_create_sections', { p_sections: mappedSections });

    if (result.error) {
        return { provisioned_count: 0, errors: [result.error.message] };
    }

    return {
        provisioned_count: result.data?.provisioned_count ?? 0,
        errors: (result.data?.errors ?? []).map((error) =>
            `Row ${error.row} (${error.code || 'unknown'}): ${error.message}`)
    };
}