import { callRpc } from '@services/supabase.wrapper';
import { GradingPeriodTemplate, SpecialGradeConfig, TransmutationRow } from '@type/grading-config.type';
import { ServiceResult } from '@type/service.type';

export async function getTransmutationTable(): Promise<ServiceResult<TransmutationRow[]>> {
    return callRpc<TransmutationRow[]>('fn_get_transmutation_table');
}

export async function saveTransmutationTable(
    rows: TransmutationRow[]
): Promise<ServiceResult<null>> {
    return callRpc<null>('fn_save_transmutation_table', {
        p_rows: rows.map((row) => ({
            transmuted_grade: Number(row.transmuted_grade),
            min_percentage: Number(row.min_percentage),
            description: row.description
        }))
    });
}

export async function getGradingPeriodTemplates(): Promise<ServiceResult<GradingPeriodTemplate[]>> {
    return callRpc<GradingPeriodTemplate[]>('fn_get_grading_period_templates');
}

export async function createGradingPeriodTemplate(
    period: GradingPeriodTemplate
): Promise<ServiceResult<null>> {
    return callRpc<null>('fn_create_grading_period_template', {
        p_name: period.name,
        p_weight: Number(period.weight),
        p_components: period.components.map((component) => ({
            name: component.name,
            weight: Number(component.weight)
        }))
    });
}

export async function updateGradingPeriodTemplate(
    id: string,
    period: GradingPeriodTemplate
): Promise<ServiceResult<null>> {
    return callRpc<null>('fn_update_grading_period_template', {
        p_id: id,
        p_name: period.name,
        p_weight: Number(period.weight),
        p_components: period.components.map((component) => ({
            name: component.name,
            weight: Number(component.weight)
        }))
    });
}

export async function deleteGradingPeriodTemplate(id: string): Promise<ServiceResult<null>> {
    return callRpc<null>('fn_delete_grading_period_template', { p_id: id });
}

export async function getSpecialGradeConfigs(): Promise<ServiceResult<SpecialGradeConfig[]>> {
    return callRpc<SpecialGradeConfig[]>('fn_get_special_grade_configs');
}

export async function saveSpecialGradeConfigs(
    configs: SpecialGradeConfig[]
): Promise<ServiceResult<null>> {
    return callRpc<null>('fn_save_special_grade_configs', {
        p_configs: configs.map((config) => ({
            id: config.id || null,
            code: config.code,
            label: config.label,
            description: config.description,
            min_absence_percentage: config.min_absence_percentage
                ? Number(config.min_absence_percentage)
                : null,
            requires_completion: config.requires_completion,
            completion_deadline_days: config.completion_deadline_days
                ? Number(config.completion_deadline_days)
                : null,
            is_passing: config.is_passing,
            is_active: config.is_active
        }))
    });
}

export async function deleteSpecialGradeConfig(id: string): Promise<ServiceResult<null>> {
    return callRpc<null>('fn_delete_special_grade_config', { p_id: id });
}