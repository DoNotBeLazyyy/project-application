import { callRpc } from '@services/supabase.wrapper';
import {
    AttendanceRecord, AttendanceRecordUpdate, AttendanceSession, AttendanceSessionFormValues, FacultyEvaluationSummary, FacultyStudentGradeBreakdown, GradeCalculationResult, GradeSheetRow, GradingComponent, GradingComponentFormValues, GradingPeriod, MySectionListRow, SectionDetail, SectionStudent, StudentAttendanceRow, StudentEvaluation, StudentGradeBreakdown
} from '@type/faculty.type';
import { SectionOverridableRule, SpecialGradeDetectionResult, SpecialGradeFlag, SpecialGradeFlagResolution } from '@type/grading-config.type';
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
): Promise<ServiceResult<GradeCalculationResult>> {
    return callRpc<GradeCalculationResult>('fn_calculate_all_grades_for_period', {
        p_section_id: sectionId,
        p_grading_period_id: gradingPeriodId
    });
}

export async function isSectionGradingLocked(
    sectionId: string,
    gradingPeriodId: string
): Promise<ServiceResult<boolean>> {
    return callRpc<boolean>('fn_is_section_grading_locked', {
        p_section_id: sectionId,
        p_grading_period_id: gradingPeriodId
    });
}

export async function reseedSectionGrading(
    sectionId: string
): Promise<ServiceResult<null>> {
    return callRpc<null>('fn_reseed_section_grading', {
        p_section_id: sectionId
    });
}
export async function listSpecialGradeFlags(
    sectionId: string,
    gradingPeriodId: string
): Promise<ServiceResult<SpecialGradeFlag[]>> {
    return callRpc<SpecialGradeFlag[]>('fn_list_special_grade_flags', {
        p_section_id: sectionId,
        p_grading_period_id: gradingPeriodId
    });
}

export async function detectSpecialGradeFlags(
    sectionId: string,
    gradingPeriodId: string
): Promise<ServiceResult<SpecialGradeDetectionResult>> {
    return callRpc<SpecialGradeDetectionResult>('fn_detect_special_grade_flags', {
        p_section_id: sectionId,
        p_grading_period_id: gradingPeriodId
    });
}

export async function applySpecialGradeFlag(
    flagId: string,
    note?: string
): Promise<ServiceResult<SpecialGradeFlagResolution>> {
    return callRpc<SpecialGradeFlagResolution>('fn_apply_special_grade_flag', {
        p_flag_id: flagId,
        p_note: note || null
    });
}

export async function dismissSpecialGradeFlag(
    flagId: string,
    reason: string
): Promise<ServiceResult<SpecialGradeFlagResolution>> {
    return callRpc<SpecialGradeFlagResolution>('fn_dismiss_special_grade_flag', {
        p_flag_id: flagId,
        p_reason: reason
    });
}

/**
 * The rules the admin has opened up for section-level thresholds, together with
 * whatever this section has already overridden.
 *
 * Returns only rules that are active, auto-detected, and explicitly marked
 * overridable — a locked rule never reaches the faculty screen at all, so the
 * UI has nothing to hide and nothing to enforce.
 */
export async function getSectionSpecialGradeOverrides(
    sectionId: string
): Promise<ServiceResult<SectionOverridableRule[]>> {
    return callRpc<SectionOverridableRule[]>('fn_get_section_special_grade_overrides', {
        p_section_id: sectionId
    });
}

/**
 * Moves one threshold for this section only. The signal and operator are not
 * sent: the database re-reads them from the institution rule, so a tampered
 * request cannot change what is measured, only the number it is measured
 * against.
 */
export async function saveSectionSpecialGradeOverride(
    sectionId: string,
    specialGradeConfigId: string,
    signal: string,
    value: number,
    valueMax?: number | null,
    note?: string | null
): Promise<ServiceResult<{ success: boolean; message: string }>> {
    return callRpc<{ success: boolean; message: string }>('fn_save_section_special_grade_override', {
        p_note: note ?? null,
        p_section_id: sectionId,
        p_signal: signal,
        p_special_grade_config_id: specialGradeConfigId,
        p_value: value,
        p_value_max: valueMax ?? null
    });
}

/** Drops this section's threshold so the institution default applies again. */
export async function clearSectionSpecialGradeOverride(
    sectionId: string,
    specialGradeConfigId: string,
    signal: string
): Promise<ServiceResult<{ success: boolean; message: string }>> {
    return callRpc<{ success: boolean; message: string }>('fn_clear_section_special_grade_override', {
        p_section_id: sectionId,
        p_signal: signal,
        p_special_grade_config_id: specialGradeConfigId
    });
}

/**
 * Officially submits calculated section grades for a grading period to the Registrar.
 */
export async function submitSectionGrades(
    sectionId: string,
    gradingPeriodId: string
): Promise<ServiceResult<{ message: string; submitted_count?: number; success: boolean }>> {
    return callRpc<{ message: string; submitted_count?: number; success: boolean }>('fn_submit_section_grades', {
        p_grading_period_id: gradingPeriodId,
        p_section_id: sectionId
    });
}

/**
 * Fetches the aggregated student evaluation performance summary for the logged-in faculty member.
 */
export async function getFacultyEvaluationSummary(
    termId?: string
): Promise<ServiceResult<FacultyEvaluationSummary>> {
    return callRpc<FacultyEvaluationSummary>('fn_get_faculty_evaluation_summary', {
        p_term_id: termId || null
    });
}

/**
 * Fetches itemized score calculation math and grade component breakdown for a specific student in a section.
 */
export async function getFacultyStudentGradeBreakdown(
    enrollmentId: string,
    gradingPeriodId: string
): Promise<ServiceResult<FacultyStudentGradeBreakdown>> {
    return callRpc<FacultyStudentGradeBreakdown>('fn_get_faculty_student_grade_breakdown', {
        p_enrollment_id: enrollmentId,
        p_grading_period_id: gradingPeriodId
    });
}
