import { callRpc } from '@services/supabase.wrapper';
import {
    CreditCoursePayload,
    CurriculumAudit,
    ProgramShiftFormValues,
    StatusChangeFormValues,
    StudentCurriculumCreditingResponse,
    StudentLifecycleEvent,
    StudentTranscript
} from '@type/records.type';
import { ServiceResult } from '@type/service.type';

export async function getCurriculumAudit(
    studentId?: string
): Promise<ServiceResult<CurriculumAudit>> {
    return callRpc<CurriculumAudit>('fn_get_curriculum_audit', {
        p_student_id: studentId ?? null
    });
}

export async function getStudentTranscript(
    studentId?: string
): Promise<ServiceResult<StudentTranscript>> {
    return callRpc<StudentTranscript>('fn_get_student_transcript', {
        p_student_id: studentId ?? null
    });
}

export async function listStudentLifecycleEvents(
    studentId?: string
): Promise<ServiceResult<StudentLifecycleEvent[]>> {
    return callRpc<StudentLifecycleEvent[]>('fn_list_student_lifecycle_events', {
        p_student_id: studentId ?? null
    });
}

export async function changeStudentStatus(
    studentId: string,
    values: StatusChangeFormValues
): Promise<ServiceResult<null>> {
    return callRpc<null>('fn_change_student_status', {
        p_effective_date: values.effective_date || null,
        p_reason: values.reason || null,
        p_status: values.status,
        p_student_id: studentId
    });
}

export async function shiftStudentProgram(
    studentId: string | null | undefined,
    values: {
        program_id: string;
        year_level?: string | number | null;
        effective_date?: string | null;
        reason?: string | null;
    }
): Promise<ServiceResult<null>> {
    return callRpc<null>('fn_shift_student_program', {
        p_effective_date: values.effective_date || null,
        p_program_id: values.program_id,
        p_reason: values.reason || null,
        p_student_id: studentId || null,
        p_year_level: values.year_level
            ? Number(values.year_level)
            : null
    });
}

export async function assignMyProgram(
    programId: string,
    yearLevel?: number | string | null
): Promise<ServiceResult<null>> {
    return callRpc<null>('fn_assign_my_program', {
        p_program_id: programId,
        p_year_level: yearLevel
            ? Number(yearLevel)
            : null
    });
}

export async function getStudentCurriculumForCrediting(
    studentId: string
): Promise<ServiceResult<StudentCurriculumCreditingResponse>> {
    return callRpc<StudentCurriculumCreditingResponse>('fn_get_student_curriculum_for_crediting', {
        p_student_id: studentId
    });
}

export async function creditStudentCourse(
    payload: CreditCoursePayload
): Promise<ServiceResult<{ success: boolean; message: string; credited_id?: string }>> {
    return callRpc<{ success: boolean; message: string; credited_id?: string }>('fn_credit_student_course', {
        p_course_id: payload.course_id,
        p_grade_display: payload.grade_display || 'Passed',
        p_grade_numeric: payload.grade_numeric ?? null,
        p_previous_course_code: payload.previous_course_code || null,
        p_previous_course_title: payload.previous_course_title || null,
        p_previous_school: payload.previous_school,
        p_remarks: payload.remarks || null,
        p_student_id: payload.student_id,
        p_units_credited: payload.units_credited ?? null
    });
}

export async function removeCreditedCourse(
    creditedId: string,
    reason?: string
): Promise<ServiceResult<{ success: boolean; message: string }>> {
    return callRpc<{ success: boolean; message: string }>('fn_remove_credited_course', {
        p_credited_id: creditedId,
        p_reason: reason || null
    });
}