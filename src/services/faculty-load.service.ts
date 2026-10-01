import { callRpc } from '@services/supabase.wrapper';
import {
    FacultyLoadAssignmentInput,
    FacultyLoadDetail,
    FacultyLoadFilterValues,
    FacultyLoadRow,
    ScheduleConflictFilterValues,
    ScheduleConflictRow
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

export async function assignSectionFaculty(
    sectionId: string,
    facultyId: string | null
): Promise<ServiceResult<{ success: boolean; message: string }>> {
    return callRpc<{ success: boolean; message: string }>('fn_assign_section_faculty', {
        p_faculty_id: facultyId || null,
        p_section_id: sectionId
    });
}

export async function saveFacultyLoadAssignments(
    assignments: FacultyLoadAssignmentInput[]
): Promise<ServiceResult<{ success: boolean; updated_count: number; message: string }>> {
    return callRpc<{ success: boolean; updated_count: number; message: string }>('fn_save_faculty_load_assignments', {
        p_assignments: assignments
    });
}