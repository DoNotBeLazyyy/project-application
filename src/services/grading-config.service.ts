import { callRpc } from '@services/supabase.wrapper';
import {
    GradingConfig, GradingConfigFormValues, GradingPeriodTemplate, SpecialGradeConfig, TransmutationRow
} from '@type/grading-config.type';
import { ServiceResult } from '@type/service.type';

export async function getGradingConfig(): Promise<ServiceResult<GradingConfig>> {
    return callRpc<GradingConfig>('fn_get_grading_config');
}

export async function updateGradingConfig(
    params: GradingConfigFormValues
): Promise<ServiceResult<null>> {
    return callRpc<null>('fn_update_grading_config', {
        p_passing_grade: Number(params.passing_grade),
        p_max_absence_percentage: Number(params.max_absence_percentage)
    });
}

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

export async function saveGradingPeriodTemplates(
    periods: GradingPeriodTemplate[]
): Promise<ServiceResult<null>> {
    return callRpc<null>('fn_save_grading_period_templates', {
        p_periods: periods.map((period, index) => ({
            name: period.name,
            sequence: index + 1,
            weight: Number(period.weight),
            components: period.components.map((component) => ({
                name: component.name,
                weight: Number(component.weight)
            }))
        }))
    });
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