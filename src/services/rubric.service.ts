import { callRpc } from '@services/supabase.wrapper';
import { ServiceResult } from '@type/service.type';
import {
    AssessmentRubricState, RubricCriterionInput, RubricDetail, RubricEvaluationInput, RubricListRow, SubmissionRubric
} from '@type/rubric.type';

export async function listRubrics(
    sectionId: string
): Promise<ServiceResult<RubricListRow[]>> {
    return callRpc<RubricListRow[]>('fn_list_rubrics', {
        p_section_id: sectionId
    });
}

export async function getRubric(
    rubricId: string
): Promise<ServiceResult<RubricDetail>> {
    return callRpc<RubricDetail>('fn_get_rubric', {
        p_rubric_id: rubricId
    });
}

export async function createRubric(
    sectionId: string,
    title: string,
    description: string,
    criteria: RubricCriterionInput[]
): Promise<ServiceResult<{ id: string }>> {
    return callRpc<{ id: string }>('fn_create_rubric', {
        p_section_id:  sectionId,
        p_title:       title,
        p_description: description || null,
        p_criteria:    criteria
    });
}

export async function updateRubric(
    rubricId: string,
    title: string,
    description: string,
    criteria: RubricCriterionInput[]
): Promise<ServiceResult<null>> {
    return callRpc<null>('fn_update_rubric', {
        p_rubric_id:   rubricId,
        p_title:       title,
        p_description: description || null,
        p_criteria:    criteria
    });
}

export async function deleteRubric(
    rubricId: string
): Promise<ServiceResult<null>> {
    return callRpc<null>('fn_delete_rubric', {
        p_rubric_id: rubricId
    });
}

export async function copyRubricToSections(
    rubricId: string,
    sectionIds: string[]
): Promise<ServiceResult<{ copied_count: number }>> {
    return callRpc<{ copied_count: number }>('fn_copy_rubric_to_sections', {
        p_rubric_id:   rubricId,
        p_section_ids: sectionIds
    });
}

export async function getAssessmentRubric(
    assessmentId: string
): Promise<ServiceResult<AssessmentRubricState>> {
    return callRpc<AssessmentRubricState>('fn_get_assessment_rubric', {
        p_assessment_id: assessmentId
    });
}

export async function setAssessmentRubric(
    assessmentId: string,
    rubricId: string | null,
    useScoring: boolean
): Promise<ServiceResult<null>> {
    return callRpc<null>('fn_set_assessment_rubric', {
        p_assessment_id: assessmentId,
        p_rubric_id:     rubricId,
        p_use_scoring:   useScoring
    });
}

export async function getSubmissionRubric(
    submissionId: string
): Promise<ServiceResult<SubmissionRubric>> {
    return callRpc<SubmissionRubric>('fn_get_submission_rubric', {
        p_submission_id: submissionId
    });
}

export async function gradeSubmissionRubric(
    submissionId: string,
    feedback: string,
    evaluations: RubricEvaluationInput[]
): Promise<ServiceResult<{ raw_score: number }>> {
    return callRpc<{ raw_score: number }>('fn_grade_submission_rubric', {
        p_submission_id: submissionId,
        p_feedback:      feedback || null,
        p_evaluations:   evaluations
    });
}