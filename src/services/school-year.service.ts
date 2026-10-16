import { supabase } from '@services/supabase.client';
import { callRpc } from '@services/supabase.wrapper';
import { CommonListResDto, SortStringDto } from '@type/http.type';
import {
    AcademicYearCalendarDetails,
    AcademicYearHistoryItem,
    SaveAcademicYearCalendarPayload,
    SchoolYearFilterValues,
    SchoolYearFormValues,
    SchoolYearListRow,
    SchoolYearOption
} from '@type/school-year.type';
import { ServiceResult } from '@type/service.type';

export async function listSchoolYears(
    page: number,
    size: number,
    search: string,
    sort: SortStringDto[],
    filters: SchoolYearFilterValues | null
): Promise<ServiceResult<CommonListResDto<SchoolYearListRow>>> {
    return callRpc<CommonListResDto<SchoolYearListRow>>('fn_list_school_years_json', {
        p_page: page,
        p_search: search || null,
        p_size: size,
        p_sort: sort.length > 0
            ? sort
            : null,
        p_is_active: filters?.is_active === 'true'
            ? true
            : filters?.is_active === 'false'
                ? false
                : null,
        p_year: filters?.year
            ? parseInt(filters.year)
            : null
    });
}

export async function getSchoolYearById(
    schoolYearId: string
): Promise<ServiceResult<SchoolYearFormValues>> {
    return callRpc<SchoolYearFormValues>('fn_get_school_year_by_id', {
        p_school_year_id: schoolYearId
    });
}

export async function getAcademicYearCalendarDetails(
    schoolYearId: string
): Promise<ServiceResult<AcademicYearCalendarDetails>> {
    const res = await callRpc<{ success: boolean; data: AcademicYearCalendarDetails }>(
        'fn_get_academic_year_calendar_details',
        { p_school_year_id: schoolYearId }
    );
    if (res.error) {
        return { data: null, error: res.error };
    }
    return { data: res.data?.data ?? null, error: null };
}

export async function saveAcademicYearCalendar(
    payload: SaveAcademicYearCalendarPayload
): Promise<ServiceResult<{ success: boolean; message: string; school_year_id: string }>> {
    const baseParams: Record<string, unknown> = {
        p_code: payload.p_code,
        p_end_date: payload.p_end_date,
        p_is_active: payload.p_is_active,
        p_label: payload.p_label,
        p_school_year_id: payload.p_school_year_id,
        p_start_date: payload.p_start_date,
        p_terms: payload.p_terms,
        p_thresholds: payload.p_thresholds || [],
        p_transmutation_rows: payload.p_transmutation_rows,
        p_max_units_per_term: payload.p_max_units_per_term ? Number(payload.p_max_units_per_term) : 24,
        p_evaluation_scope: payload.p_evaluation_scope || 'Period',
        p_holidays: payload.p_holidays || []
    };

    if (payload.p_revert_history_id && payload.p_school_year_id) {
        // First try the 13-arg RPC with p_revert_history_id (silent so fallback doesn't flash toast)
        const revertRpcRes = await callRpc<{ success: boolean; message: string; school_year_id: string }>(
            'fn_save_academic_year_calendar',
            {
                ...baseParams,
                p_revert_history_id: payload.p_revert_history_id
            },
            { silent: true }
        );

        if (!revertRpcRes.error) {
            return revertRpcRes;
        }

        // Fallback when remote DB still has the 12-arg RPC:
        // 1. Snapshot existing history IDs before saving
        const { data: beforeRows } = await supabase
            .from('school_year_histories')
            .select('id, changes')
            .eq('school_year_id', payload.p_school_year_id)
            .is('deleted_at', null);

        const existingIds = new Set((beforeRows || []).map((r) => r.id));

        // 2. Execute the 12-arg RPC silently to synchronize tables
        const fallbackRes = await callRpc<{ success: boolean; message: string; school_year_id: string }>(
            'fn_save_academic_year_calendar',
            baseParams,
            { silent: true }
        );

        if (fallbackRes.error) {
            return fallbackRes;
        }

        // 3. Soft-delete any newly created history row so revert does NOT create a new version,
        // and persist active version marker on the target history row
        const { data: afterRows } = await supabase
            .from('school_year_histories')
            .select('id, changes')
            .eq('school_year_id', payload.p_school_year_id)
            .is('deleted_at', null)
            .order('changed_at', { ascending: false });

        if (afterRows && afterRows.length > 0) {
            const newlyCreatedIds = afterRows
                .filter((r) => !existingIds.has(r.id) && r.id !== payload.p_revert_history_id)
                .map((r) => r.id);

            if (newlyCreatedIds.length > 0) {
                await supabase
                    .from('school_year_histories')
                    .update({ deleted_at: new Date().toISOString() })
                    .in('id', newlyCreatedIds);
            }

            // Mark target version as active in changes metadata for all remaining rows
            const remainingRows = afterRows.filter((r) => !newlyCreatedIds.includes(r.id));
            await Promise.all(
                remainingRows.map((r) => {
                    const currentChanges =
                        r.changes && typeof r.changes === 'object' ? (r.changes as Record<string, unknown>) : {};
                    return supabase
                        .from('school_year_histories')
                        .update({
                            changes: {
                                ...currentChanges,
                                is_active_version: r.id === payload.p_revert_history_id
                            }
                        })
                        .eq('id', r.id);
                })
            );
        }

        return fallbackRes;
    }

    // Normal create/update save
    const res = await callRpc<{ success: boolean; message: string; school_year_id: string }>(
        'fn_save_academic_year_calendar',
        baseParams
    );

    // Ensure the newly created latest version is the active version
    const savedSyId = res.data?.school_year_id || payload.p_school_year_id;
    if (!res.error && savedSyId) {
        const { data: rows } = await supabase
            .from('school_year_histories')
            .select('id, changes')
            .eq('school_year_id', savedSyId)
            .is('deleted_at', null)
            .order('changed_at', { ascending: false });

        if (rows && rows.length > 0) {
            const newestId = rows[0].id;
            await Promise.all(
                rows.map((r) => {
                    const currentChanges =
                        r.changes && typeof r.changes === 'object' ? (r.changes as Record<string, unknown>) : {};
                    const shouldBeActive = r.id === newestId;
                    if (currentChanges.is_active_version === shouldBeActive) return Promise.resolve();
                    return supabase
                        .from('school_year_histories')
                        .update({
                            changes: {
                                ...currentChanges,
                                is_active_version: shouldBeActive
                            }
                        })
                        .eq('id', r.id);
                })
            );
        }
    }

    return res;
}

export async function getAcademicYearHistory(
    schoolYearId: string
): Promise<ServiceResult<AcademicYearHistoryItem[]>> {
    const res = await callRpc<{ success: boolean; data: AcademicYearHistoryItem[] }>(
        'fn_get_academic_year_history',
        { p_school_year_id: schoolYearId }
    );
    if (res.error) {
        return { data: null, error: res.error };
    }
    return { data: res.data?.data ?? [], error: null };
}

export async function createSchoolYear(
    params: SchoolYearFormValues
): Promise<ServiceResult<null>> {
    return callRpc<null>('fn_create_school_year', {
        p_code: params.code,
        p_end_date: params.end_date,
        p_is_active: params.is_active,
        p_label: params.label,
        p_start_date: params.start_date
    });
}

export async function updateSchoolYear(
    schoolYearId: string,
    params: SchoolYearFormValues
): Promise<ServiceResult<null>> {
    return callRpc<null>('fn_update_school_year', {
        p_code: params.code,
        p_end_date: params.end_date,
        p_is_active: params.is_active,
        p_label: params.label,
        p_school_year_id: schoolYearId,
        p_start_date: params.start_date
    });
}

export async function deleteSchoolYear(
    schoolYearId: string
): Promise<ServiceResult<null>> {
    return callRpc<null>('fn_delete_school_year', {
        p_school_year_id: schoolYearId
    });
}

export async function bulkDeleteSchoolYears(
    schoolYearIds: string[]
): Promise<ServiceResult<null>> {
    return callRpc<null>('fn_bulk_delete_school_years', {
        p_school_year_ids: schoolYearIds
    });
}

export async function getSchoolYears(): Promise<ServiceResult<SchoolYearOption[]>> {
    return callRpc<SchoolYearOption[]>('fn_get_school_years');
}
