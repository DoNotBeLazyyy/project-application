import { callRpc } from '@services/supabase.wrapper';
import { BulkImportResult } from '@type/bulk-import.type';
import {
    BulkEnrollStudentParams, BulkEnrollStudentResult, EligibleSectionRow, EnrollmentBulkRow,
    EnrollmentStudentDetail, EnrollmentStudentFilterValues, EnrollmentStudentRow, EnrollmentTargetTerm
} from '@type/enrollment.type';
import { CommonListResDto, SortStringDto } from '@type/http.type';
import { ServiceResult } from '@type/service.type';

export async function getEnrollmentTargetTerm(): Promise<ServiceResult<EnrollmentTargetTerm>> {
    return callRpc<EnrollmentTargetTerm>('fn_get_enrollment_target_term');
}

export async function listEnrollmentStudents(
    page: number,
    size: number,
    search: string,
    sort: SortStringDto[],
    termId: string | null,
    filters: EnrollmentStudentFilterValues | null
): Promise<ServiceResult<CommonListResDto<EnrollmentStudentRow>>> {
    return callRpc<CommonListResDto<EnrollmentStudentRow>>('fn_list_enrollment_students_json', {
        p_page: page,
        p_search: search || null,
        p_size: size,
        p_sort: sort.length > 0
            ? sort
            : null,
        p_term_id: termId,
        p_program_ids: filters?.program_ids?.length
            ? filters.program_ids
            : null,
        p_year_levels: filters?.year_levels?.length
            ? filters.year_levels.map(Number)
            : null,
        p_statuses: filters?.statuses?.length
            ? filters.statuses
            : null,
        p_enrollment_states: filters?.enrollment_states?.length
            ? filters.enrollment_states
            : null
    });
}

export async function getEnrollmentStudentDetail(
    studentId: string,
    termId: string | null
): Promise<ServiceResult<EnrollmentStudentDetail>> {
    return callRpc<EnrollmentStudentDetail>('fn_get_enrollment_student_detail', {
        p_student_id: studentId,
        p_term_id: termId
    });
}

export async function listEligibleSections(
    studentId: string,
    termId: string | null,
    search: string
): Promise<ServiceResult<EligibleSectionRow[]>> {
    return callRpc<EligibleSectionRow[]>('fn_list_eligible_sections', {
        p_student_id: studentId,
        p_term_id: termId,
        p_search: search || null
    });
}

export async function bulkEnrollStudent(
    params: BulkEnrollStudentParams
): Promise<ServiceResult<BulkEnrollStudentResult>> {
    return callRpc<BulkEnrollStudentResult>('fn_bulk_enroll_student', {
        p_student_id: params.student_id,
        p_section_ids: params.section_ids,
        p_allow_conflict: params.allow_conflict,
        p_conflict_reason: params.conflict_reason || null,
        p_override_prerequisites: params.override_prerequisites
    });
}

export async function dropEnrollment(
    enrollmentId: string,
    dropReason: string
): Promise<ServiceResult<null>> {
    return callRpc<null>('fn_drop_enrollment', {
        p_enrollment_id: enrollmentId,
        p_drop_reason: dropReason || null
    });
}

export async function bulkEnrollStudents(
    rows: EnrollmentBulkRow[]
): Promise<BulkImportResult> {
    const result = await callRpc<{
        provisioned_count: number;
        errors: { row: number; code: string; message: string }[];
    }>('fn_bulk_enroll_students', { p_rows: rows });

    if (result.error) {
        return { provisioned_count: 0, errors: [result.error.message] };
    }

    return {
        provisioned_count: result.data?.provisioned_count ?? 0,
        errors: (result.data?.errors ?? []).map((error) =>
            `Row ${error.row} (${error.code || 'unknown'}): ${error.message}`)
    };
}