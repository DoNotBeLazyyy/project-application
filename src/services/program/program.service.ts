import { callRpc } from '@services/supabase.wrapper';
import { BulkImportResult } from '@type/bulk-import.type';
import { CommonListResDto, SortStringDto } from '@type/http.type';
import {
    ProgramBulkImportResult, ProgramBulkRow, ProgramFilterValues, ProgramFormValues, ProgramListRow, ProgramOption
} from '@type/program/program.type';
import { ServiceResult } from '@type/service.type';

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
    return callRpc<null>('fn_create_program', {
        p_code: params.code,
        p_department_id: params.department_id,
        p_description: params.description || null,
        p_is_active: params.is_active,
        p_name: params.name,
        p_program_level_id: params.program_level_id,
        p_total_units: params.total_units
            ? Number(params.total_units)
            : null,
        p_years_duration: Number(params.years_duration)
    });
}

export async function updateProgram(
    programId: string,
    params: ProgramFormValues
): Promise<ServiceResult<null>> {
    return callRpc<null>('fn_update_program', {
        p_code: params.code,
        p_department_id: params.department_id,
        p_description: params.description || null,
        p_is_active: params.is_active,
        p_name: params.name,
        p_program_id: programId,
        p_program_level_id: params.program_level_id,
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
    const result = await callRpc<ProgramBulkImportResult>('fn_bulk_create_programs', {
        p_programs: programs
    });

    if (result.error) {
        return { provisioned_count: 0, errors: [result.error.message] };
    }

    return {
        provisioned_count: result.data?.provisioned_count ?? 0,
        errors: (result.data?.errors ?? []).map((error) =>
            `Row ${error.row} (${error.code || 'unknown'}): ${error.message}`)
    };
}