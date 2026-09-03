import { callRpc } from '@services/supabase.wrapper';
import { BulkImportResult } from '@type/bulk-import.type';
import {
    EvaluationForm, EvaluationResponseInput, EvaluationStatusFilter, EvaluationTemplateBulkRow, EvaluationTemplateForm,
    EvaluationTemplateListRow, EvaluationTemplateRow, MyEvaluationRow
} from '@type/evaluation.type';
import { CommonListResDto, SortStringDto } from '@type/http.type';
import { ServiceResult } from '@type/service.type';

export async function listEvaluationTemplates(
    page: number,
    size: number,
    search: string,
    sort: SortStringDto[]
): Promise<ServiceResult<CommonListResDto<EvaluationTemplateListRow>>> {
    return callRpc<CommonListResDto<EvaluationTemplateListRow>>('fn_list_evaluation_templates_json', {
        p_page: page,
        p_size: size,
        p_search: search || null,
        p_sort: sort.length > 0
            ? sort
            : null
    });
}

export async function getEvaluationTemplateById(id: string): Promise<ServiceResult<EvaluationTemplateRow>> {
    return callRpc<EvaluationTemplateRow>('fn_get_evaluation_template_by_id', { p_id: id });
}

export async function listMyEvaluations(
    page: number,
    size: number,
    search: string,
    sort: SortStringDto[],
    status: EvaluationStatusFilter
): Promise<ServiceResult<CommonListResDto<MyEvaluationRow>>> {
    return callRpc<CommonListResDto<MyEvaluationRow>>('fn_list_my_evaluations_json', {
        p_page: page,
        p_size: size,
        p_search: search || null,
        p_sort: sort.length > 0
            ? sort
            : null,
        p_status: status || null
    });
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
        p_questions: mapQuestions(template),
        p_target_mode: template.target_mode || 'INCLUDE',
        p_suggestion_placeholder: template.suggestion_placeholder || null
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
        p_questions: mapQuestions(template),
        p_target_mode: template.target_mode || 'INCLUDE',
        p_suggestion_placeholder: template.suggestion_placeholder || null
    });
}

export async function deleteEvaluationTemplate(id: string): Promise<ServiceResult<null>> {
    return callRpc<null>('fn_delete_evaluation_template', { p_id: id });
}

export async function bulkCreateEvaluationTemplates(
    rows: EvaluationTemplateBulkRow[]
): Promise<BulkImportResult> {
    const result = await callRpc<{
        provisioned_count: number;
        errors: { row: number; code: string; message: string }[];
    }>('fn_bulk_create_evaluation_templates', { p_rows: rows });

    if (result.error) {
        return { provisioned_count: 0, errors: [result.error.message] };
    }

    return {
        provisioned_count: result.data?.provisioned_count ?? 0,
        errors: (result.data?.errors ?? []).map((error) =>
            `Row ${error.row} (${error.code || 'unknown'}): ${error.message}`)
    };
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
    return template.questions.map((question) => {
        const questionType = question.question_type || 'Rating';

        return {
            question_text: question.question_text,
            question_type: questionType,
            is_required: question.is_required ?? true,
            min_rating: questionType === 'Rating'
                ? Number(question.min_rating || 1)
                : null,
            max_rating: questionType === 'Rating'
                ? Number(question.max_rating || 5)
                : null
        };
    });
}