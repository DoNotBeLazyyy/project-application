import { callRpc } from '@services/supabase.wrapper';
import { AssessmentIntegrityReport, AssessmentItemAnalysis, SectionInsight, StudentInsight } from '@type/analytics.type';
import { ServiceResult } from '@type/service.type';

export async function getStudentInsight(
    studentId?: string,
    termId?: string
): Promise<ServiceResult<StudentInsight>> {
    return callRpc<StudentInsight>('fn_get_student_insight', {
        p_student_id: studentId ?? null,
        p_term_id: termId ?? null
    });
}

export async function getSectionInsight(
    sectionId: string
): Promise<ServiceResult<SectionInsight>> {
    return callRpc<SectionInsight>('fn_get_section_insight', {
        p_section_id: sectionId
    });
}

export async function getAssessmentItemAnalysis(
    assessmentId: string
): Promise<ServiceResult<AssessmentItemAnalysis>> {
    return callRpc<AssessmentItemAnalysis>('fn_get_assessment_item_analysis', {
        p_assessment_id: assessmentId
    });
}

export async function getAssessmentIntegrityReport(
    assessmentId: string
): Promise<ServiceResult<AssessmentIntegrityReport>> {
    return callRpc<AssessmentIntegrityReport>('fn_get_assessment_integrity_report', {
        p_assessment_id: assessmentId
    });
}