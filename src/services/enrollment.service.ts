import { callRpc } from '@services/supabase.wrapper';
import { BulkImportResult } from '@type/bulk-import.type';
import { EnrollmentBulkRow, EnrollmentFilterValues, EnrollmentFormValues, EnrollmentListRow } from '@type/enrollment.type';
import { CommonListResDto, SortStringDto } from '@type/http.type';
import { ServiceResult } from '@type/service.type';

export async function listEnrollments(
    page: number,
    size: number,
    search: string,
    sort: SortStringDto[],
    filters: EnrollmentFilterValues | null
): Promise<ServiceResult<CommonListResDto<EnrollmentListRow>>> {
    return callRpc<CommonListResDto<EnrollmentListRow>>('fn_list_enrollments_json', {
        p_page: page,
        p_search: search || null,
        p_size: size,
        p_sort: sort.length > 0
            ? sort
            : null,
        p_term_ids: filters?.term_ids?.length
            ? filters.term_ids
            : null,
        p_section_ids: filters?.section_ids?.length
            ? filters.section_ids
            : null,
        p_statuses: filters?.statuses?.length
            ? filters.statuses
            : null
    });
}

export async function getEnrollmentById(
    enrollmentId: string
): Promise<ServiceResult<EnrollmentFormValues>> {
    return callRpc<EnrollmentFormValues>('fn_get_enrollment_by_id', {
        p_enrollment_id: enrollmentId
    });
}

export async function createEnrollment(
    params: EnrollmentFormValues
): Promise<ServiceResult<null>> {
    return callRpc<null>('fn_create_enrollment', {
        p_student_id: params.student_id,
        p_section_id: params.section_id
    });
}

export async function updateEnrollment(
    enrollmentId: string,
    params: EnrollmentFormValues
): Promise<ServiceResult<null>> {
    return callRpc<null>('fn_update_enrollment', {
        p_enrollment_id: enrollmentId,
        p_status: params.status
    });
}

export async function deleteEnrollment(
    enrollmentId: string
): Promise<ServiceResult<null>> {
    return callRpc<null>('fn_delete_enrollment', {
        p_enrollment_id: enrollmentId
    });
}

export async function bulkDeleteEnrollments(
    enrollmentIds: string[]
): Promise<ServiceResult<null>> {
    return callRpc<null>('fn_bulk_delete_enrollments', {
        p_enrollment_ids: enrollmentIds
    });
}

export async function bulkCreateEnrollments(
    enrollments: EnrollmentBulkRow[]
): Promise<BulkImportResult> {
    const result = await callRpc<{
        provisioned_count: number;
        errors: { row: number; code: string; message: string }[];
    }>('fn_bulk_create_enrollments', { p_enrollments: enrollments });

    if (result.error) {
        return { provisioned_count: 0, errors: [result.error.message] };
    }

    return {
        provisioned_count: result.data?.provisioned_count ?? 0,
        errors: (result.data?.errors ?? []).map((error) =>
            `Row ${error.row} (${error.code || 'unknown'}): ${error.message}`)
    };
}