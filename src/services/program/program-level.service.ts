import { callRpc } from '@services/supabase.wrapper';
import { CommonListResDto, SortStringDto } from '@type/http.type';
import { ProgramLevelFormValues, ProgramLevelListRow, ProgramLevelOption } from '@type/program/program-level.type';
import { ServiceResult } from '@type/service.type';

export async function listProgramLevels(
    page: number,
    size: number,
    search: string,
    sort: SortStringDto[]
): Promise<ServiceResult<CommonListResDto<ProgramLevelListRow>>> {
    return callRpc<CommonListResDto<ProgramLevelListRow>>('fn_list_program_levels_json', {
        p_page: page,
        p_search: search || null,
        p_size: size,
        p_sort: sort.length > 0
            ? sort
            : null
    });
}

export async function getProgramLevelById(
    programLevelId: string
): Promise<ServiceResult<ProgramLevelFormValues>> {
    return callRpc<ProgramLevelFormValues>('fn_get_program_level_by_id', {
        p_program_level_id: programLevelId
    });
}

export async function getProgramLevels(): Promise<ServiceResult<ProgramLevelOption[]>> {
    return callRpc<ProgramLevelOption[]>('fn_get_program_levels');
}

export async function createProgramLevel(
    params: ProgramLevelFormValues
): Promise<ServiceResult<null>> {
    return callRpc<null>('fn_create_program_level', {
        p_code: params.code,
        p_description: params.description || null,
        p_label: params.label
    });
}

export async function updateProgramLevel(
    programLevelId: string,
    params: ProgramLevelFormValues
): Promise<ServiceResult<null>> {
    return callRpc<null>('fn_update_program_level', {
        p_code: params.code,
        p_description: params.description || null,
        p_label: params.label,
        p_program_level_id: programLevelId
    });
}

export async function deleteProgramLevel(
    programLevelId: string
): Promise<ServiceResult<null>> {
    return callRpc<null>('fn_delete_program_level', {
        p_program_level_id: programLevelId
    });
}