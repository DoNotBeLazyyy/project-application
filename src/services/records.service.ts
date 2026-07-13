import { callRpc } from '@services/supabase.wrapper';
import {
    CurriculumAudit, ProgramShiftFormValues, StatusChangeFormValues, StudentLifecycleEvent, StudentTranscript
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
    studentId: string,
    values: ProgramShiftFormValues
): Promise<ServiceResult<null>> {
    return callRpc<null>('fn_shift_student_program', {
        p_effective_date: values.effective_date || null,
        p_program_id: values.program_id,
        p_reason: values.reason || null,
        p_student_id: studentId,
        p_year_level: values.year_level
            ? Number(values.year_level)
            : null
    });
}