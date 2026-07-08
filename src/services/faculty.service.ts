import { callRpc } from '@services/supabase.wrapper';
import {
    AttendanceRecord, AttendanceRecordUpdate, AttendanceSession, AttendanceSessionFormValues, GradeSheetRow, GradingComponent, GradingComponentFormValues, GradingPeriod, MySectionListRow, SectionDetail, SectionStudent, StudentAttendanceRow, StudentEvaluation, StudentGradeBreakdown
} from '@type/faculty.type';
import { CommonListResDto, SortStringDto } from '@type/http.type';
import { ServiceResult } from '@type/service.type';

export async function listMySections(
    page: number,
    size: number,
    search: string,
    sort: SortStringDto[]
): Promise<ServiceResult<CommonListResDto<MySectionListRow>>> {
    return callRpc<CommonListResDto<MySectionListRow>>('fn_list_my_sections', {
        p_page: page,
        p_search: search || null,
        p_size: size,
        p_sort: sort.length > 0
            ? sort
            : null
    });
}

export async function getSectionDetail(
    sectionId: string
): Promise<ServiceResult<SectionDetail>> {
    return callRpc<SectionDetail>('fn_get_section_detail', {
        p_section_id: sectionId
    });
}

export async function listSectionStudents(
    sectionId: string,
    page: number,
    size: number,
    search: string,
    sort: SortStringDto[]
): Promise<ServiceResult<CommonListResDto<SectionStudent>>> {
    return callRpc<CommonListResDto<SectionStudent>>('fn_list_section_students', {
        p_section_id: sectionId,
        p_page: page,
        p_search: search || null,
        p_size: size,
        p_sort: sort.length > 0
            ? sort
            : null
    });
}

export async function getSectionStudentEvaluation(
    enrollmentId: string
): Promise<ServiceResult<StudentEvaluation>> {
    return callRpc<StudentEvaluation>('fn_get_section_student_evaluation', {
        p_enrollment_id: enrollmentId
    });
}

export async function getStudentAttendance(
    enrollmentId: string
): Promise<ServiceResult<StudentAttendanceRow[]>> {
    return callRpc<StudentAttendanceRow[]>('fn_get_student_attendance', {
        p_enrollment_id: enrollmentId
    });
}

export async function getStudentGradeBreakdown(
    enrollmentId: string,
    gradingPeriodId: string
): Promise<ServiceResult<StudentGradeBreakdown>> {
    return callRpc<StudentGradeBreakdown>('fn_get_student_grade_breakdown', {
        p_enrollment_id: enrollmentId,
        p_grading_period_id: gradingPeriodId
    });
}

export async function listAttendanceSessions(
    sectionId: string
): Promise<ServiceResult<AttendanceSession[]>> {
    return callRpc<AttendanceSession[]>('fn_list_attendance_sessions', {
        p_section_id: sectionId
    });
}

export async function createAttendanceSession(
    sectionId: string,
    params: AttendanceSessionFormValues
): Promise<ServiceResult<null>> {
    return callRpc<null>('fn_create_attendance_session', {
        p_section_id: sectionId,
        p_session_date: params.session_date,
        p_notes: params.notes || null
    });
}

export async function deleteAttendanceSession(
    sessionId: string
): Promise<ServiceResult<null>> {
    return callRpc<null>('fn_delete_attendance_session', {
        p_session_id: sessionId
    });
}

export async function getAttendanceRecords(
    sessionId: string
): Promise<ServiceResult<AttendanceRecord[]>> {
    return callRpc<AttendanceRecord[]>('fn_get_attendance_records', {
        p_session_id: sessionId
    });
}

export async function saveAttendanceRecords(
    sessionId: string,
    records: AttendanceRecordUpdate[]
): Promise<ServiceResult<null>> {
    return callRpc<null>('fn_save_attendance_records', {
        p_session_id: sessionId,
        p_records: records
    });
}

export async function listGradingPeriodsBySection(
    sectionId: string
): Promise<ServiceResult<GradingPeriod[]>> {
    return callRpc<GradingPeriod[]>('fn_list_grading_periods_by_section', {
        p_section_id: sectionId
    });
}

export async function listGradingComponents(
    sectionId: string,
    gradingPeriodId: string
): Promise<ServiceResult<GradingComponent[]>> {
    return callRpc<GradingComponent[]>('fn_list_grading_components', {
        p_section_id: sectionId,
        p_grading_period_id: gradingPeriodId
    });
}

export async function createGradingComponent(
    sectionId: string,
    gradingPeriodId: string,
    params: GradingComponentFormValues
): Promise<ServiceResult<null>> {
    return callRpc<null>('fn_create_grading_component', {
        p_section_id: sectionId,
        p_grading_period_id: gradingPeriodId,
        p_name: params.name,
        p_weight: Number(params.weight)
    });
}

export async function updateGradingComponent(
    componentId: string,
    params: GradingComponentFormValues
): Promise<ServiceResult<null>> {
    return callRpc<null>('fn_update_grading_component', {
        p_component_id: componentId,
        p_name: params.name,
        p_weight: Number(params.weight)
    });
}

export async function deleteGradingComponent(
    componentId: string
): Promise<ServiceResult<null>> {
    return callRpc<null>('fn_delete_grading_component', {
        p_component_id: componentId
    });
}

export async function listGradeSheet(
    sectionId: string,
    gradingPeriodId: string
): Promise<ServiceResult<GradeSheetRow[]>> {
    return callRpc<GradeSheetRow[]>('fn_list_grade_sheet', {
        p_section_id: sectionId,
        p_grading_period_id: gradingPeriodId
    });
}

export async function calculateAllGradesForPeriod(
    sectionId: string,
    gradingPeriodId: string
): Promise<ServiceResult<null>> {
    return callRpc<null>('fn_calculate_all_grades_for_period', {
        p_section_id: sectionId,
        p_grading_period_id: gradingPeriodId
    });
}