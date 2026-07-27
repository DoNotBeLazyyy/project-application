import { callRpc } from '@services/supabase.wrapper';
import { ProgressionCohortFilters, ProgressionPreview, ProgressionRunResult } from '@type/progression.type';
import { ServiceResult } from '@type/service.type';

function resolveCohortParams(termId: string, filters: ProgressionCohortFilters) {
    return {
        p_term_id: termId,
        p_program_ids: filters.program_ids.length > 0
            ? filters.program_ids
            : null,
        p_year_levels: filters.year_levels.length > 0
            ? filters.year_levels.map(Number)
            : null,
        p_student_ids: null
    };
}

export async function previewBatchProgression(
    termId: string,
    filters: ProgressionCohortFilters
): Promise<ServiceResult<ProgressionPreview>> {
    return callRpc<ProgressionPreview>(
        'fn_preview_batch_progression',
        resolveCohortParams(termId, filters)
    );
}

export async function runBatchProgression(
    termId: string,
    filters: ProgressionCohortFilters,
    autoEnroll: boolean,
    reason: string
): Promise<ServiceResult<ProgressionRunResult>> {
    return callRpc<ProgressionRunResult>('fn_run_batch_progression', {
        ...resolveCohortParams(termId, filters),
        p_auto_enroll: autoEnroll,
        p_reason: reason || null
    });
}