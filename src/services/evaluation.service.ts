import { callRpc } from '@services/supabase.wrapper';
import { EvaluationForm, EvaluationResponseInput, EvaluationTemplateForm, EvaluationTemplateRow } from '@type/evaluation.type';
import { ServiceResult } from '@type/service.type';

export async function getEvaluationTemplates(): Promise<ServiceResult<EvaluationTemplateRow[]>> {
    return callRpc<EvaluationTemplateRow[]>('fn_get_evaluation_templates');
}

export async function createEvaluationTemplate(
    template: EvaluationTemplateForm
): Promise<ServiceResult<null>> {
    return callRpc<null>('fn_create_evaluation_template', {
        p_title: template.title,
        p_description: template.description || null,
        p_is_active: template.is_active,
        p_sequence: Number(template.sequence || 1),
        p_program_ids: mapProgramIds(template),
        p_questions: mapQuestions(template)
    });
}

export async function updateEvaluationTemplate(
    id: string,
    template: EvaluationTemplateForm
): Promise<ServiceResult<null>> {
    return callRpc<null>('fn_update_evaluation_template', {
        p_id: id,
        p_title: template.title,
        p_description: template.description || null,
        p_is_active: template.is_active,
        p_sequence: Number(template.sequence || 1),
        p_program_ids: mapProgramIds(template),
        p_questions: mapQuestions(template)
    });
}

export async function deleteEvaluationTemplate(id: string): Promise<ServiceResult<null>> {
    return callRpc<null>('fn_delete_evaluation_template', { p_id: id });
}

export async function getEvaluationForm(
    enrollmentId: string,
    gradingPeriodId: string
): Promise<ServiceResult<EvaluationForm>> {
    return callRpc<EvaluationForm>('fn_get_evaluation_form', {
        p_enrollment_id: enrollmentId,
        p_grading_period_id: gradingPeriodId
    });
}

export async function submitEvaluation(
    enrollmentId: string,
    gradingPeriodId: string,
    responses: EvaluationResponseInput[]
): Promise<ServiceResult<null>> {
    return callRpc<null>('fn_submit_evaluation', {
        p_enrollment_id: enrollmentId,
        p_grading_period_id: gradingPeriodId,
        p_responses: responses.map((response) => ({
            question_id: response.question_id,
            rating_value: response.rating_value || null,
            response_text: response.response_text || null
        }))
    });
}

function mapProgramIds(template: EvaluationTemplateForm): string[] | null {
    return template.program_ids?.length
        ? template.program_ids
        : null;
}

function mapQuestions(template: EvaluationTemplateForm) {
    return template.questions.map((question) => ({
        question_text: question.question_text,
        question_type: question.question_type,
        is_required: question.is_required,
        min_rating: question.question_type === 'Rating'
            ? Number(question.min_rating || 1)
            : null,
        max_rating: question.question_type === 'Rating'
            ? Number(question.max_rating || 5)
            : null
    }));
}