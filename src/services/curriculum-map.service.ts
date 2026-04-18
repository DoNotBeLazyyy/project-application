import { callRpc } from '@services/supabase.wrapper';
import { BulkImportResult } from '@type/bulk-import.type';
import { CurriculumMapBulkRow, CurriculumMapEntry, CurriculumMapFormValues } from '@type/curriculum-map.type';
import { ServiceResult } from '@type/service.type';

export async function getCurriculumMap(
    programId: string,
    schoolYearId?: string
): Promise<ServiceResult<CurriculumMapEntry[]>> {
    return callRpc<CurriculumMapEntry[]>('fn_get_curriculum_map', {
        p_program_id: programId,
        p_school_year_id: schoolYearId || null
    });
}

export async function createCurriculumMapEntry(
    programId: string,
    params: CurriculumMapFormValues,
    schoolYearId?: string
): Promise<ServiceResult<null>> {
    return callRpc<null>('fn_create_curriculum_map_entry', {
        p_program_id: programId,
        p_course_id: params.course_id,
        p_year_level: Number(params.year_level),
        p_term_type_id: params.term_type_id,
        p_school_year_id: schoolYearId || null,
        p_sequence: Number(params.sequence),
        p_is_elective: params.is_elective
    });
}

export async function updateCurriculumMapEntry(
    curriculumMapId: string,
    params: CurriculumMapFormValues,
    schoolYearId?: string
): Promise<ServiceResult<null>> {
    return callRpc<null>('fn_update_curriculum_map_entry', {
        p_curriculum_map_id: curriculumMapId,
        p_course_id: params.course_id,
        p_year_level: Number(params.year_level),
        p_term_type_id: params.term_type_id,
        p_school_year_id: schoolYearId || null,
        p_sequence: Number(params.sequence),
        p_is_elective: params.is_elective
    });
}

export async function deleteCurriculumMapEntry(
    curriculumMapId: string
): Promise<ServiceResult<null>> {
    return callRpc<null>('fn_delete_curriculum_map_entry', {
        p_curriculum_map_id: curriculumMapId
    });
}

export async function bulkCreateCurriculumMap(
    entries: CurriculumMapBulkRow[]
): Promise<BulkImportResult> {
    const result = await callRpc<{
        provisioned_count: number;
        errors: { row: number; code: string; message: string }[];
    }>('fn_bulk_create_curriculum_map', { p_entries: entries });

    if (result.error) {
        return { provisioned_count: 0, errors: [result.error.message] };
    }

    return {
        provisioned_count: result.data?.provisioned_count ?? 0,
        errors: (result.data?.errors ?? []).map((error) =>
            `Row ${error.row} (${error.code || 'unknown'}): ${error.message}`)
    };
}