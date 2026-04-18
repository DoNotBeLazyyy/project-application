import { callRpc } from '@services/supabase.wrapper';
import { BulkImportResult } from '@type/bulk-import.type';
import { CommonListResDto, SortStringDto } from '@type/http.type';
import { ServiceResult } from '@type/service.type';
import {
    StudentBulkRow, StudentFilterValues, StudentFormValues, StudentListRow, StudentOption
} from '@type/student.type';

export async function listStudents(
    page: number,
    size: number,
    search: string,
    sort: SortStringDto[],
    filters: StudentFilterValues | null
): Promise<ServiceResult<CommonListResDto<StudentListRow>>> {
    return callRpc<CommonListResDto<StudentListRow>>('fn_list_students_json', {
        p_page: page,
        p_search: search || null,
        p_size: size,
        p_sort: sort.length > 0
            ? sort
            : null,
        p_program_ids: filters?.program_ids?.length
            ? filters.program_ids
            : null,
        p_year_levels: filters?.year_levels?.length
            ? filters.year_levels.map(Number)
            : null,
        p_statuses: filters?.statuses?.length
            ? filters.statuses
            : null
    });
}

export async function getStudentById(
    studentId: string
): Promise<ServiceResult<StudentFormValues>> {
    return callRpc<StudentFormValues>('fn_get_student_by_id', {
        p_student_id: studentId
    });
}

export async function getStudents(): Promise<ServiceResult<StudentOption[]>> {
    return callRpc<StudentOption[]>('fn_get_students');
}

export async function createStudent(
    params: StudentFormValues
): Promise<ServiceResult<null>> {
    return callRpc<null>('fn_create_student', {
        p_user_id: params.user_id,
        p_student_number: params.student_number,
        p_program_id: params.program_id || null,
        p_year_level: Number(params.year_level),
        p_admitted_at: params.admitted_at || null
    });
}

export async function updateStudent(
    studentId: string,
    params: StudentFormValues
): Promise<ServiceResult<null>> {
    return callRpc<null>('fn_update_student', {
        p_student_id: studentId,
        p_student_number: params.student_number,
        p_program_id: params.program_id || null,
        p_year_level: Number(params.year_level),
        p_admitted_at: params.admitted_at || null,
        p_status: params.status
    });
}

export async function deleteStudent(
    studentId: string
): Promise<ServiceResult<null>> {
    return callRpc<null>('fn_delete_student', {
        p_student_id: studentId
    });
}

export async function bulkDeleteStudents(
    studentIds: string[]
): Promise<ServiceResult<null>> {
    return callRpc<null>('fn_bulk_delete_students', {
        p_student_ids: studentIds
    });
}

export async function evaluateStudentYearLevel(
    studentId: string
): Promise<ServiceResult<null>> {
    return callRpc<null>('fn_evaluate_student_year_level', {
        p_student_id: studentId
    });
}

export async function bulkCreateStudents(
    students: StudentBulkRow[]
): Promise<BulkImportResult> {
    const result = await callRpc<{
        provisioned_count: number;
        errors: { row: number; code: string; message: string }[];
    }>('fn_bulk_create_students', { p_students: students });

    if (result.error) {
        return { provisioned_count: 0, errors: [result.error.message] };
    }

    return {
        provisioned_count: result.data?.provisioned_count ?? 0,
        errors: (result.data?.errors ?? []).map((error) =>
            `Row ${error.row} (${error.code || 'unknown'}): ${error.message}`)
    };
}