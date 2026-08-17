import { callRpc } from '@services/supabase.wrapper';
import {
    FacultyLoadDetail, FacultyLoadFilterValues, FacultyLoadRow, ScheduleConflictFilterValues, ScheduleConflictRow
} from '@type/faculty-load.type';
import { CommonListResDto, SortStringDto } from '@type/http.type';
import { ServiceResult } from '@type/service.type';

export async function listFacultyLoad(
    page: number,
    size: number,
    search: string,
    sort: SortStringDto[],
    filters: FacultyLoadFilterValues | null
): Promise<ServiceResult<CommonListResDto<FacultyLoadRow>>> {
    return callRpc<CommonListResDto<FacultyLoadRow>>('fn_list_faculty_load_json', {
        p_page: page,
        p_search: search || null,
        p_size: size,
        p_sort: sort.length > 0
            ? sort
            : null,
        p_term_id: filters?.term_id || null
    });
}

export async function listScheduleConflicts(
    page: number,
    size: number,
    search: string,
    sort: SortStringDto[],
    filters: ScheduleConflictFilterValues | null
): Promise<ServiceResult<CommonListResDto<ScheduleConflictRow>>> {
    return callRpc<CommonListResDto<ScheduleConflictRow>>('fn_list_schedule_conflicts_json', {
        p_conflict_types: filters?.conflict_types?.length
            ? filters.conflict_types
            : null,
        p_page: page,
        p_search: search || null,
        p_size: size,
        p_sort: sort.length > 0
            ? sort
            : null,
        p_term_id: filters?.term_id || null
    });
}

export async function getFacultyLoadDetail(
    facultyId: string,
    termId: string | null
): Promise<ServiceResult<FacultyLoadDetail>> {
    return callRpc<FacultyLoadDetail>('fn_get_faculty_load_detail', {
        p_faculty_id: facultyId,
        p_term_id: termId || null
    });
}