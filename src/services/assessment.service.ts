import { supabase } from '@services/supabase.client';
import { callRpc } from '@services/supabase.wrapper';
import {
    AssessmentFormValues, AssessmentListRow, AssessmentQuestion, GradeAnswerUpdate, QuestionFormValues, SubmissionForGrading, SubmissionListRow
} from '@type/assessment.type';
import { ServiceResult } from '@type/service.type';

export async function listAssessments(
    sectionId: string
): Promise<ServiceResult<AssessmentListRow[]>> {
    return callRpc<AssessmentListRow[]>('fn_list_assessments', {
        p_section_id: sectionId
    });
}

export async function getAssessmentById(
    assessmentId: string
): Promise<ServiceResult<AssessmentFormValues>> {
    return callRpc<AssessmentFormValues>('fn_get_assessment_by_id', {
        p_assessment_id: assessmentId
    });
}

export async function createAssessment(
    sectionId: string,
    params: AssessmentFormValues
): Promise<ServiceResult<{ id: string }>> {
    return callRpc<{ id: string }>('fn_create_assessment', {
        p_section_id:             sectionId,
        p_title:                  params.title,
        p_description:            params.description || null,
        p_assessment_type:        params.assessment_type,
        p_grading_component_id:   params.grading_component_id || null,
        p_total_points:           Number(params.total_points),
        p_passing_points:         params.passing_points
            ? Number(params.passing_points)
            : null,
        p_time_limit_minutes:     params.time_limit_minutes
            ? Number(params.time_limit_minutes)
            : null,
        p_max_attempts:           params.max_attempts
            ? Number(params.max_attempts)
            : 1,
        p_opens_at:               params.opens_at || null,
        p_due_at:                 params.due_at || null,
        p_closes_at:              params.closes_at || null,
        p_show_results_at:        params.show_results_at || null,
        p_scheduled_publish_at:   params.scheduled_publish_at || null,
        p_shuffle_questions:      params.shuffle_questions,
        p_shuffle_choices:        params.shuffle_choices,
        p_show_all_questions:     params.show_all_questions,
        p_questions_per_page:     params.show_all_questions
            ? null
            : params.questions_per_page
                ? Number(params.questions_per_page)
                : null
    });
}

export async function updateAssessment(
    assessmentId: string,
    params: AssessmentFormValues
): Promise<ServiceResult<null>> {
    return callRpc<null>('fn_update_assessment', {
        p_assessment_id:          assessmentId,
        p_title:                  params.title,
        p_description:            params.description || null,
        p_assessment_type:        params.assessment_type,
        p_grading_component_id:   params.grading_component_id || null,
        p_total_points:           Number(params.total_points),
        p_passing_points:         params.passing_points
            ? Number(params.passing_points)
            : null,
        p_time_limit_minutes:     params.time_limit_minutes
            ? Number(params.time_limit_minutes)
            : null,
        p_max_attempts:           params.max_attempts
            ? Number(params.max_attempts)
            : 1,
        p_opens_at:               params.opens_at || null,
        p_due_at:                 params.due_at || null,
        p_closes_at:              params.closes_at || null,
        p_show_results_at:        params.show_results_at || null,
        p_scheduled_publish_at:   params.scheduled_publish_at || null,
        p_shuffle_questions:      params.shuffle_questions,
        p_shuffle_choices:        params.shuffle_choices,
        p_show_all_questions:     params.show_all_questions,
        p_questions_per_page:     params.show_all_questions
            ? null
            : params.questions_per_page
                ? Number(params.questions_per_page)
                : null
    });
}

export async function publishAssessment(
    assessmentId: string
): Promise<ServiceResult<null>> {
    return callRpc<null>('fn_publish_assessment', {
        p_assessment_id: assessmentId
    });
}

export async function unpublishAssessment(
    assessmentId: string
): Promise<ServiceResult<null>> {
    return callRpc<null>('fn_unpublish_assessment', {
        p_assessment_id: assessmentId
    });
}

export async function deleteAssessment(
    assessmentId: string
): Promise<ServiceResult<null>> {
    return callRpc<null>('fn_delete_assessment', {
        p_assessment_id: assessmentId
    });
}

export async function uploadAssessmentAttachment(
    assessmentId: string,
    file: File
): Promise<ServiceResult<null>> {
    const path = `assessments/${assessmentId}/${Date.now()}_${file.name}`;

    const { error: uploadError } = await supabase.storage
        .from('materials')
        .upload(path, file, { upsert: false });

    if (uploadError) {
        return { data: null, error: { message: uploadError.message } };
    }

    const { data: urlData } = supabase.storage
        .from('materials')
        .getPublicUrl(path);

    return callRpc<null>('fn_create_assessment_attachment', {
        p_assessment_id:    assessmentId,
        p_file_name:        file.name,
        p_file_url:         path,
        p_file_size_bytes:  file.size,
        p_mime_type:        file.type,
        p_sequence:         1
    });
}

export async function getAttachmentSignedUrl(
    filePath: string
): Promise<string> {
    const { data } = await supabase.storage
        .from('materials')
        .createSignedUrl(filePath, 3600);

    return data?.signedUrl ?? '';
}

export async function deleteAssessmentAttachment(
    attachmentId: string
): Promise<ServiceResult<null>> {
    return callRpc<null>('fn_delete_assessment_attachment', {
        p_attachment_id: attachmentId
    });
}

export async function getAssessmentQuestions(
    assessmentId: string
): Promise<ServiceResult<AssessmentQuestion[]>> {
    return callRpc<AssessmentQuestion[]>('fn_get_assessment_questions', {
        p_assessment_id: assessmentId
    });
}

export async function upsertQuestion(
    assessmentId: string,
    questionId: string | null,
    params: QuestionFormValues,
    sequence: number
): Promise<ServiceResult<{ id: string }>> {
    const needsChoices = ['Multiple Choice', 'True or False', 'Matching'].includes(params.question_type);

    return callRpc<{ id: string }>('fn_upsert_question', {
        p_assessment_id:       assessmentId,
        p_question_id:         questionId || null,
        p_question_text:       params.question_text,
        p_question_type:       params.question_type,
        p_points:              Number(params.points),
        p_sequence:            sequence,
        p_explanation:         params.explanation || null,
        p_is_required:         params.is_required,
        p_allowed_file_types:  params.allowed_file_types
            ? params.allowed_file_types.split(',')
                .map((t) => t.trim())
                .filter(Boolean)
            : null,
        p_max_file_size_mb:    params.max_file_size_mb
            ? Number(params.max_file_size_mb)
            : null,
        p_max_file_count:      params.max_file_count
            ? Number(params.max_file_count)
            : null,
        p_choices:             needsChoices
            ? params.choices.map((c) => ({ choice_text: c.choice_text, is_correct: c.is_correct }))
            : null
    });
}

export async function deleteQuestion(
    questionId: string
): Promise<ServiceResult<null>> {
    return callRpc<null>('fn_delete_question', {
        p_question_id: questionId
    });
}

export async function listSubmissions(
    assessmentId: string
): Promise<ServiceResult<SubmissionListRow[]>> {
    return callRpc<SubmissionListRow[]>('fn_list_submissions', {
        p_assessment_id: assessmentId
    });
}

export async function getSubmissionForGrading(
    submissionId: string
): Promise<ServiceResult<SubmissionForGrading>> {
    return callRpc<SubmissionForGrading>('fn_get_submission_for_grading', {
        p_submission_id: submissionId
    });
}

export async function gradeSubmission(
    submissionId: string,
    feedback: string,
    answers: GradeAnswerUpdate[]
): Promise<ServiceResult<null>> {
    return callRpc<null>('fn_grade_submission', {
        p_submission_id: submissionId,
        p_feedback:      feedback || null,
        p_answers:       answers
    });
}