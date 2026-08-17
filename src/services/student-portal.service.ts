import { supabase } from '@services/supabase.client';
import { callRpc, callStorage } from '@services/supabase.wrapper';
import { CommonListResDto, SortStringDto } from '@type/http.type';
import { ServiceResult } from '@type/service.type';
import {
    DraftAnswer, MyGradeBreakdown, MyGradeListRow, MySubjectListRow, ProctorEventType, StudentAssessment, StudentAssessmentResult, StudentDashboard, StudentQuestion, StudentScheduleSection, StudentSectionColor, SubjectAssessmentItem, SubjectDetail, SubjectGradeItem, SubmissionFileAttachment
} from '@type/student-portal.type';
import { parseServiceError } from '@utils/error.util';

export async function getStudentDashboard(): Promise<ServiceResult<StudentDashboard>> {
    return callRpc<StudentDashboard>('fn_get_student_dashboard');
}

export async function getStudentSchedule(): Promise<ServiceResult<StudentScheduleSection[]>> {
    return callRpc<StudentScheduleSection[]>('fn_get_student_schedule');
}

export async function listStudentSubjects(
    page: number,
    size: number,
    search: string,
    sort: SortStringDto[]
): Promise<ServiceResult<CommonListResDto<MySubjectListRow>>> {
    return callRpc<CommonListResDto<MySubjectListRow>>('fn_list_my_subjects', {
        p_page: page,
        p_search: search || null,
        p_size: size,
        p_sort: sort.length > 0
            ? sort
            : null
    });
}

export async function getSubjectDetail(
    enrollmentId: string
): Promise<ServiceResult<SubjectDetail>> {
    return callRpc<SubjectDetail>('fn_get_subject_detail', {
        p_enrollment_id: enrollmentId
    });
}

export async function getSubjectAssessments(
    enrollmentId: string
): Promise<ServiceResult<SubjectAssessmentItem[]>> {
    return callRpc<SubjectAssessmentItem[]>('fn_get_subject_assessments', {
        p_enrollment_id: enrollmentId
    });
}

export async function getSubjectGrades(
    enrollmentId: string
): Promise<ServiceResult<SubjectGradeItem[]>> {
    return callRpc<SubjectGradeItem[]>('fn_get_subject_grades', {
        p_enrollment_id: enrollmentId
    });
}

export async function getAssessmentForStudent(
    assessmentId: string,
    enrollmentId: string
): Promise<ServiceResult<StudentAssessment>> {
    return callRpc<StudentAssessment>('fn_get_assessment_for_student', {
        p_assessment_id: assessmentId,
        p_enrollment_id: enrollmentId
    });
}

export async function getAssessmentQuestionsForStudent(
    assessmentId: string,
    enrollmentId: string,
    submissionId: string
): Promise<ServiceResult<StudentQuestion[]>> {
    return callRpc<StudentQuestion[]>('fn_get_assessment_questions_for_student', {
        p_assessment_id: assessmentId,
        p_enrollment_id: enrollmentId,
        p_submission_id: submissionId
    });
}

export async function getMyAssessmentResult(
    enrollmentId: string,
    assessmentId: string
): Promise<ServiceResult<StudentAssessmentResult>> {
    return callRpc<StudentAssessmentResult>('fn_get_my_assessment_result', {
        p_assessment_id: assessmentId,
        p_enrollment_id: enrollmentId
    });
}

export async function startAssessmentTimer(
    enrollmentId: string,
    assessmentId: string
): Promise<ServiceResult<{ submission_id: string; expires_at: string | null }>> {
    return callRpc<{ submission_id: string; expires_at: string | null }>('fn_start_assessment_timer', {
        p_enrollment_id: enrollmentId,
        p_assessment_id: assessmentId
    });
}

export async function saveStudentAnswer(
    submissionId: string,
    answer: DraftAnswer
): Promise<ServiceResult<null>> {
    return callRpc<null>('fn_save_student_answer', {
        p_submission_id: submissionId,
        p_question_id:   answer.question_id,
        p_answer_text:   answer.answer_text || null,
        p_choice_id:     answer.choice_id || null
    });
}

export async function uploadSubmissionFile(
    submissionId: string,
    questionId: string,
    file: File
): Promise<ServiceResult<SubmissionFileAttachment>> {
    const path = `${submissionId}/${questionId}/${Date.now()}_${file.name}`;

    return callStorage(async function() {
        const { error } = await supabase.storage
            .from('submissions')
            .upload(path, file, { upsert: false });

        if (error) {
            return { data: null, error: parseServiceError(error) };
        }

        return { data: { name: file.name, path }, error: null };
    });
}

export async function saveStudentAnswerFiles(
    submissionId: string,
    questionId: string,
    files: SubmissionFileAttachment[]
): Promise<ServiceResult<null>> {
    return callRpc<null>('fn_save_student_answer_files', {
        p_files: files,
        p_question_id: questionId,
        p_submission_id: submissionId
    }, { background: true });
}

export async function submitAssessment(
    submissionId: string
): Promise<ServiceResult<null>> {
    return callRpc<null>('fn_submit_assessment', {
        p_submission_id: submissionId
    });
}

export async function recordHeartbeat(
    submissionId: string
): Promise<ServiceResult<null>> {
    return callRpc<null>('fn_record_heartbeat', {
        p_submission_id: submissionId
    });
}

export async function recordFocusEvent(
    submissionId: string,
    eventType: ProctorEventType
): Promise<ServiceResult<null>> {
    return callRpc<null>('fn_record_focus_event', {
        p_event_type: eventType,
        p_submission_id: submissionId
    }, { background: true, silent: true });
}

export async function listStudentGrades(
    page: number,
    size: number,
    sort: SortStringDto[],
    termId: string
): Promise<ServiceResult<CommonListResDto<MyGradeListRow>>> {
    return callRpc<CommonListResDto<MyGradeListRow>>('fn_list_my_grades', {
        p_page: page,
        p_size: size,
        p_sort: sort.length > 0
            ? sort
            : null,
        p_term_id: termId || null
    });
}

export async function getMyGradeBreakdown(
    enrollmentId: string,
    gradingPeriodId: string
): Promise<ServiceResult<MyGradeBreakdown>> {
    return callRpc<MyGradeBreakdown>('fn_get_my_grade_breakdown', {
        p_enrollment_id: enrollmentId,
        p_grading_period_id: gradingPeriodId
    });
}

export async function upsertSectionColor(
    sectionId: string,
    color: string
): Promise<ServiceResult<null>> {
    return callRpc<null>('fn_upsert_student_section_color', {
        p_section_id: sectionId,
        p_color: color
    });
}

export async function listMySectionColors(): Promise<ServiceResult<StudentSectionColor[]>> {
    return callRpc<StudentSectionColor[]>('fn_list_my_section_colors');
}