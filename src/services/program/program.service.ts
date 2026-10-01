import { bulkCreateCurriculumMap, createCurriculumMapEntry } from '@services/curriculum-map.service';
import { callRpc } from '@services/supabase.wrapper';
import { BulkImportResult } from '@type/bulk-import.type';
import { CurriculumMapBulkRow } from '@type/curriculum-map.type';
import { CommonListResDto, SortStringDto } from '@type/http.type';
import {
    ProgramBulkImportResult, ProgramBulkRow, ProgramFilterValues, ProgramFormValues, ProgramListRow, ProgramOption
} from '@type/program/program.type';
import { ServiceResult } from '@type/service.type';
import { nullIfBlank } from '@utils/uuid.util';

export async function listPrograms(
    page: number,
    size: number,
    search: string,
    sort: SortStringDto[],
    filters: ProgramFilterValues | null
): Promise<ServiceResult<CommonListResDto<ProgramListRow>>> {
    return callRpc<CommonListResDto<ProgramListRow>>('fn_list_programs_json', {
        p_page: page,
        p_search: search || null,
        p_size: size,
        p_sort: sort.length > 0
            ? sort
            : null,
        p_department_ids: filters?.department_ids?.length
            ? filters.department_ids
            : null,
        p_program_level_ids: filters?.program_level_ids?.length
            ? filters.program_level_ids
            : null,
        p_is_active: filters?.is_active === 'true'
            ? true
            : filters?.is_active === 'false'
                ? false
                : null
    });
}

export async function getProgramById(
    programId: string
): Promise<ServiceResult<ProgramFormValues>> {
    return callRpc<ProgramFormValues>('fn_get_program_by_id', {
        p_program_id: programId
    });
}

export async function getPrograms(): Promise<ServiceResult<ProgramOption[]>> {
    return callRpc<ProgramOption[]>('fn_get_programs');
}

export async function createProgram(
    params: ProgramFormValues
): Promise<ServiceResult<null>> {
    const result = await callRpc<{ id?: string; program_id?: string }>('fn_create_program', {
        p_code: params.code,
        p_department_id: nullIfBlank(params.department_id),
        p_description: params.description || null,
        p_is_active: params.is_active,
        p_name: params.name,
        p_program_level_id: nullIfBlank(params.program_level_id),
        p_total_units: params.total_units
            ? Number(params.total_units)
            : null,
        p_years_duration: Number(params.years_duration)
    });

    if (!result.error && params.curriculum_entries && params.curriculum_entries.length > 0) {
        const programId = result.data?.id || result.data?.program_id;
        if (programId) {
            await Promise.allSettled(
                params.curriculum_entries.map((entry) =>
                    createCurriculumMapEntry(
                        programId,
                        {
                            course_id: entry.course_id,
                            is_elective: Boolean(entry.is_elective),
                            sequence: String(entry.sequence ?? 1),
                            term_type_id: entry.term_type_id,
                            year_level: String(entry.year_level)
                        },
                        entry.school_year_id
                    )
                )
            );
        }
    }

    return { data: null, error: result.error };
}

export async function updateProgram(
    programId: string,
    params: ProgramFormValues
): Promise<ServiceResult<null>> {
    return callRpc<null>('fn_update_program', {
        p_code: params.code,
        p_department_id: nullIfBlank(params.department_id),
        p_description: params.description || null,
        p_is_active: params.is_active,
        p_name: params.name,
        p_program_id: programId,
        p_program_level_id: nullIfBlank(params.program_level_id),
        p_total_units: params.total_units
            ? Number(params.total_units)
            : null,
        p_years_duration: Number(params.years_duration)
    });
}

export async function deleteProgram(
    programId: string
): Promise<ServiceResult<null>> {
    return callRpc<null>('fn_delete_program', {
        p_program_id: programId
    });
}

export async function bulkDeletePrograms(
    programIds: string[]
): Promise<ServiceResult<null>> {
    return callRpc<null>('fn_bulk_delete_programs', {
        p_program_ids: programIds
    });
}

export async function bulkCreatePrograms(
    programs: ProgramBulkRow[]
): Promise<BulkImportResult> {
    const uniqueProgramsMap = new Map<string, ProgramBulkRow>();
    const curriculumRows: CurriculumMapBulkRow[] = [];

    for (const row of programs) {
        const codeKey = row.code?.trim().toUpperCase();
        if (codeKey && !uniqueProgramsMap.has(codeKey)) {
            uniqueProgramsMap.set(codeKey, row);
        }

        if (row.course_code?.trim()) {
            curriculumRows.push({
                program_code: row.code?.trim() || '',
                course_code: row.course_code.trim(),
                year_level: String(row.year_level || '1'),
                term_type_code: String(row.term_type_code || '1ST_SEM'),
                school_year_code: String(row.school_year_code || ''),
                sequence: String(row.sequence || '1'),
                is_elective: String(row.is_elective ?? 'false')
            });
        }
    }

    const uniqueProgramRows = Array.from(uniqueProgramsMap.values());

    const result = await callRpc<ProgramBulkImportResult>('fn_bulk_create_programs', {
        p_programs: uniqueProgramRows
    });

    if (result.error) {
        return { provisioned_count: 0, errors: [result.error.message] };
    }

    const errors: string[] = (result.data?.errors ?? []).map((error) =>
        `Row ${error.row} (${error.code || 'unknown'}): ${error.message}`
    );

    const provisionedCount = result.data?.provisioned_count ?? 0;

    if (curriculumRows.length > 0) {
        const currResult = await bulkCreateCurriculumMap(curriculumRows);
        if (currResult.errors && currResult.errors.length > 0) {
            errors.push(...currResult.errors);
        }
    }

    return {
        provisioned_count: provisionedCount,
        errors
    };
}