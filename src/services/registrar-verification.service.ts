import { callRpc } from '@services/supabase.wrapper';
import { CommonListResDto, SortStringDto } from '@type/http.type';
import { ProfileFormValues } from '@type/profile.type';
import {
    RegistrarLogFilterValues,
    RegistrarLogRow,
    StudentProfileRequestRow
} from '@type/registrar-verification.type';
import { ServiceResult } from '@type/service.type';

export async function listStudentProfileRequests(
    page: number,
    size: number,
    search: string,
    sort: SortStringDto[],
    status: string | null
): Promise<ServiceResult<CommonListResDto<StudentProfileRequestRow>>> {
    return callRpc<CommonListResDto<StudentProfileRequestRow>>('fn_list_student_profile_requests', {
        p_page: page,
        p_search: search || null,
        p_size: size,
        p_sort: sort.length > 0 ? sort : null,
        p_status: status && status !== 'All' ? status : null
    });
}

export async function getStudentProfileRequestById(
    requestId: string
): Promise<ServiceResult<StudentProfileRequestRow>> {
    return callRpc<StudentProfileRequestRow>('fn_get_student_profile_request_by_id', {
        p_request_id: requestId
    });
}

export async function approveStudentProfileRequest(
    requestId: string,
    editedChanges?: Partial<ProfileFormValues> | null,
    notes?: string | null
): Promise<ServiceResult<null>> {
    return callRpc<null>('fn_approve_student_profile_request', {
        p_edited_changes: editedChanges || null,
        p_notes: notes || null,
        p_request_id: requestId
    });
}

export async function rejectStudentProfileRequest(
    requestId: string,
    reason: string,
    isFalseInfo = false
): Promise<ServiceResult<null>> {
    return callRpc<null>('fn_reject_student_profile_request', {
        p_is_false_info: isFalseInfo,
        p_reason: reason,
        p_request_id: requestId
    });
}

export async function sendStudentProfileNotification(
    studentId: string,
    title: string,
    message: string
): Promise<ServiceResult<null>> {
    return callRpc<null>('fn_send_student_profile_notification', {
        p_message: message,
        p_student_id: studentId,
        p_title: title
    });
}

export async function listRegistrarLogs(
    page: number,
    size: number,
    search: string,
    sort: SortStringDto[],
    filters: RegistrarLogFilterValues | null
): Promise<ServiceResult<CommonListResDto<RegistrarLogRow>>> {
    return callRpc<CommonListResDto<RegistrarLogRow>>('fn_list_registrar_logs', {
        p_action: filters?.action && filters.action !== 'All' ? filters.action : null,
        p_date_from: filters?.date_from || null,
        p_date_to: filters?.date_to || null,
        p_page: page,
        p_search: search || null,
        p_size: size,
        p_sort: sort.length > 0 ? sort : null
    });
}

export async function registrarUpdateStudentProfile(
    studentId: string,
    profileValues: Partial<ProfileFormValues>,
    reason?: string,
    notifyStudent = true
): Promise<ServiceResult<null>> {
    return callRpc<null>('fn_registrar_update_student_profile', {
        p_notify_student: notifyStudent,
        p_profile_values: profileValues,
        p_reason: reason || null,
        p_student_id: studentId
    });
}

export async function cancelMyProfileRequest(
    requestId: string
): Promise<ServiceResult<null>> {
    return callRpc<null>('fn_cancel_my_profile_request', {
        p_request_id: requestId
    });
}
