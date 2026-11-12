import { callRpc } from '@services/supabase.wrapper';
import { BulkImportError, BulkImportRowItem, DetailedBulkImportResult } from '@type/bulk-import.type';
import { CommonListResDto, SortStringDto } from '@type/http.type';
import {
    SavedSectionRow, SectionBulkRow, SectionDetail, SectionFilterValues, SectionFormValues, SectionGradingComponentOverride, SectionGradingPeriodOverride, SectionListRow, SectionOption, SectionScheduleBlock,
    SectionScheduleSlot
} from '@type/section.type';
import { ServiceResult } from '@type/service.type';
import { nullIfBlank } from '@utils/uuid.util';

export function groupScheduleSlotsToBlocks(slots: SectionScheduleSlot[]): SectionScheduleBlock[] {
    if (!slots || slots.length === 0) return [];

    const map = new Map<string, SectionScheduleBlock>();

    for (const slot of slots) {
        const start = (slot.time_start || '').slice(0, 5);
        const end = (slot.time_end || '').slice(0, 5);
        const room = slot.room || '';
        const key = `${start}_${end}_${room}`;

        const existing = map.get(key);

        if (existing) {
            if (!existing.days.includes(slot.day_of_week)) {
                existing.days.push(slot.day_of_week);
            }
        }
        else {
            map.set(key, {
                days: [slot.day_of_week],
                room,
                time_end: end,
                time_start: start
            });
        }
    }

    return Array.from(map.values());
}

export function flattenScheduleBlocksToSlots(blocks: SectionScheduleBlock[]): SectionScheduleSlot[] {
    if (!blocks || blocks.length === 0) return [];

    const slots: SectionScheduleSlot[] = [];

    for (const block of blocks) {
        const start = (block.time_start || '').slice(0, 5);
        const end = (block.time_end || '').slice(0, 5);

        if (!start || !end || !block.days || block.days.length === 0) continue;

        for (const day of block.days) {
            slots.push({
                day_of_week: day,
                room: block.room || null,
                time_end: end,
                time_start: start
            });
        }
    }

    return slots;
}

export interface SectionScheduleConflict {
    conflict_type: 'Faculty' | 'Room';
    section_code: string;
    day_of_week: string;
    time_start: string;
    time_end: string;
    room: string | null;
}

/**
 * Lists the faculty and room clashes the given slots would create in the term, ignoring the
 * section being edited.
 */
export async function checkSectionScheduleConflicts(params: {
    termId: string;
    facultyId?: string | null;
    sectionRoom?: string | null;
    slots: SectionScheduleSlot[];
    sectionId?: string | null;
}): Promise<ServiceResult<SectionScheduleConflict[]>> {
    return callRpc<SectionScheduleConflict[]>('fn_check_section_schedule_conflicts', {
        p_term_id: params.termId,
        p_faculty_id: nullIfBlank(params.facultyId ?? ''),
        p_section_room: params.sectionRoom || null,
        p_slots: params.slots,
        p_section_id: params.sectionId ?? null
    });
}

export async function saveSectionSchedules(
    sectionId: string,
    schedules: SectionScheduleSlot[]
): Promise<ServiceResult<null>> {
    return callRpc<null>('fn_save_section_schedules', {
        p_section_id: sectionId,
        p_schedules: schedules
    });
}

/**
 * Replaces a section's grading components with a dean-defined override. Periods are matched
 * to the term's grading periods by sequence (then name); periods with recorded grades are
 * skipped by the database. fn_create_grading_component is faculty-only, hence the
 * dedicated dean/admin function.
 *
 * @param sectionId - Section whose components are replaced.
 * @param periods - Override periods with their components (weights total 100 per period).
 * @returns
 */
export async function saveSectionGradingOverride(
    sectionId: string,
    periods: SectionGradingPeriodOverride[]
): Promise<ServiceResult<null>> {
    return callRpc<null>('fn_save_section_grading_override', {
        p_section_id: sectionId,
        p_periods: periods.map((period) => ({
            components: (period.components || []).map((component) => ({
                name: component.name.trim(),
                weight: Number(component.weight)
            })),
            name: period.name,
            sequence: period.sequence
        }))
    });
}

export async function listSections(
    page: number,
    size: number,
    search: string,
    sort: SortStringDto[],
    filters: SectionFilterValues | null
): Promise<ServiceResult<CommonListResDto<SectionListRow>>> {
    return callRpc<CommonListResDto<SectionListRow>>('fn_list_sections_json', {
        p_page: page,
        p_search: search || null,
        p_size: size,
        p_sort: sort.length > 0
            ? sort
            : null,
        p_term_ids: filters?.term_ids?.length
            ? filters.term_ids
            : null,
        p_course_ids: filters?.course_ids?.length
            ? filters.course_ids
            : null,
        p_statuses: filters?.statuses?.length
            ? filters.statuses
            : null,
        p_program_ids: filters?.program_ids?.length
            ? filters.program_ids
            : null
    });
}

export interface SectionOfferingRecord {
    id: string;
    term_id: string;
    course_id: string;
    faculty_id: string | null;
}

export async function getExistingSectionOfferings(): Promise<ServiceResult<SectionOfferingRecord[]>> {
    const listRes = await listSections(1, 1000, '', [], null);
    if (listRes.data?.content) {
        return {
            data: listRes.data.content.map((s) => ({
                id: s.id,
                term_id: s.term_id,
                course_id: s.course_id,
                faculty_id: s.faculty_id
            })),
            error: null
        };
    }

    return { data: [], error: listRes.error };
}

export async function getSectionById(
    sectionId: string
): Promise<ServiceResult<SectionDetail>> {
    return callRpc<SectionDetail>('fn_get_section_by_id', {
        p_section_id: sectionId
    });
}

/**
 * Puts a section back on the term's default grading. Periods that already have grades or
 * assessments are kept as they are.
 *
 * @param sectionId - Section whose override is removed.
 * @returns
 */
export async function resetSectionGradingOverride(
    sectionId: string
): Promise<ServiceResult<null>> {
    return callRpc<null>('fn_reset_section_grading_override', {
        p_section_id: sectionId
    });
}

export async function getSections(): Promise<ServiceResult<SectionOption[]>> {
    return callRpc<SectionOption[]>('fn_get_sections');
}

export async function createSection(
    params: SectionFormValues
): Promise<ServiceResult<{ id?: string }>> {
    const code = params.section_code && params.section_code.trim() !== ''
        ? params.section_code.trim()
        : null;

    return callRpc<{ id?: string }>('fn_create_section', {
        p_term_id: nullIfBlank(params.term_id),
        p_course_id: nullIfBlank(params.course_id),
        p_faculty_id: nullIfBlank(params.faculty_id),
        p_section_code: code,
        p_room: params.room || null,
        p_max_slots: Number(params.max_slots),
        p_status: 'Open'
    });
}

export async function updateSection(
    sectionId: string,
    params: SectionFormValues
): Promise<ServiceResult<null>> {
    return callRpc<null>('fn_update_section', {
        p_section_id: sectionId,
        p_term_id: nullIfBlank(params.term_id),
        p_course_id: nullIfBlank(params.course_id),
        p_faculty_id: nullIfBlank(params.faculty_id),
        p_section_code: params.section_code || '',
        p_room: params.room || null,
        p_max_slots: Number(params.max_slots),
        p_status: params.status
    });
}

export async function deleteSection(
    sectionId: string
): Promise<ServiceResult<null>> {
    return callRpc<null>('fn_delete_section', {
        p_section_id: sectionId
    });
}

export async function bulkDeleteSections(
    sectionIds: string[]
): Promise<ServiceResult<null>> {
    return callRpc<null>('fn_bulk_delete_sections', {
        p_section_ids: sectionIds
    });
}

export function parseGradingPeriodsSchema(input?: string): SectionGradingPeriodOverride[] {
    if (!input || !input.trim()) return [];
    const trimmed = input.trim();

    if (trimmed.startsWith('[')) {
        try {
            const jsonParsed = JSON.parse(trimmed);
            if (Array.isArray(jsonParsed)) {
                return jsonParsed.map((item, idx) => ({
                    components: Array.isArray(item.components)
                        ? item.components.map((c: { name?: unknown; weight?: unknown }) => ({
                            name: String(c.name || 'Component'),
                            weight: Number(c.weight) || 0
                        }))
                        : [
                            { name: 'Quizzes', weight: 30 },
                            { name: 'Class Standing', weight: 30 },
                            { name: 'Major Exam', weight: 40 }
                        ],
                    name: item.name || `Period ${idx + 1}`,
                    sequence: Number(item.sequence) || idx + 1,
                    weight: Number(item.weight) || 0
                }));
            }
        }
        catch {
            // fall through to text parsing
        }
    }

    const delimiter = (trimmed.includes(';') || trimmed.includes('|'))
        ? /;|\|/
        : (trimmed.includes('(')
            ? /;/
            : /,/);
    const entryStrings = trimmed.split(delimiter)
        .map((s) => s.trim())
        .filter(Boolean);

    const periods: SectionGradingPeriodOverride[] = [];

    entryStrings.forEach((entryStr, pIdx) => {
        const periodMatch = entryStr.match(/^([^(:]+)(?::(\d+(?:\.\d+)?))?(?:\(([^)]+)\))?$/);

        if (periodMatch) {
            const periodName = periodMatch[1].trim();
            const periodWeight = periodMatch[2]
                ? parseFloat(periodMatch[2])
                : 0;
            const componentsStr = periodMatch[3];

            const components: SectionGradingComponentOverride[] = [];

            if (componentsStr && componentsStr.trim()) {
                const compTokens = componentsStr.split(/[,;]/)
                    .map((c) => c.trim())
                    .filter(Boolean);
                compTokens.forEach((compToken) => {
                    const compMatch = compToken.match(/^([^:]+)(?::(\d+(?:\.\d+)?))?$/);
                    if (compMatch) {
                        components.push({
                            name: compMatch[1].trim(),
                            weight: compMatch[2]
                                ? parseFloat(compMatch[2])
                                : 0
                        });
                    }
                });
            }

            if (components.length === 0) {
                components.push(
                    { name: 'Quizzes', weight: 30 },
                    { name: 'Class Standing', weight: 30 },
                    { name: 'Major Exam', weight: 40 }
                );
            }

            periods.push({
                components,
                name: periodName,
                sequence: pIdx + 1,
                weight: periodWeight
            });
        }
    });

    return periods;
}

export async function bulkCreateSections(
    sections: SectionBulkRow[]
): Promise<DetailedBulkImportResult> {
    // A blank section code is generated by fn_bulk_create_sections (COURSE-001, COURSE-002, ...)
    const mappedSections = sections.map((row) => ({
        ...row,
        section_code: row.section_code?.trim() ?? ''
    }));

    const result = await callRpc<{
        provisioned?: number;
        provisioned_count?: number;
        created_count?: number;
        updated_count?: number;
        created_rows?: SavedSectionRow[];
        updated_rows?: SavedSectionRow[];
        errors: BulkImportError[];
    }>('fn_bulk_create_sections', { p_sections: mappedSections });

    let provisionedCount = 0;
    let updatedCount = 0;
    let createdRows: SavedSectionRow[] = [];
    let updatedRows: SavedSectionRow[] = [];
    let structuredErrors: BulkImportError[] = [];

    if (!result.error && result.data) {
        // The live function reports the count as `provisioned`
        provisionedCount = result.data.provisioned ?? result.data.provisioned_count ?? 0;
        updatedCount = result.data.updated_count ?? 0;
        createdRows = result.data.created_rows ?? [];
        updatedRows = result.data.updated_rows ?? [];
        structuredErrors = result.data.errors ?? [];
    }
    else if (result.error) {
        return {
            errors: [result.error.message],
            provisioned_count: 0
        };
    }

    // fn_bulk_create_sections already saved each row's schedule (with the term's faculty and
    // room conflict check); only custom grading periods are applied here.
    const savedRows = [...createdRows, ...updatedRows];
    for (const saved of savedRows) {
        const row = mappedSections[Number(saved.row) - 1];
        if (!row || !saved.section_id || !row.grading_periods?.trim()) continue;

        const customPeriods = parseGradingPeriodsSchema(row.grading_periods);
        if (customPeriods.length === 0) continue;

        const gradingRes = await saveSectionGradingOverride(saved.section_id, customPeriods);
        if (gradingRes.error) {
            structuredErrors.push({
                code: saved.section_code || row.section_code || 'unknown',
                message: `Section saved, but its grading periods were not applied: ${gradingRes.error.message}`,
                row: Number(saved.row)
            });
        }
    }

    // Rows the server skipped because of a faculty or room clash
    const structuredConflicts = structuredErrors.filter((error) => error.code === 'SCHEDULE_CONFLICT');
    const conflictRows: BulkImportRowItem[] = structuredConflicts.map((conflict) => {
        const row = mappedSections[conflict.row - 1];

        return {
            course_code: row?.course_code,
            days: row?.schedule_days,
            faculty_email: row?.faculty_email,
            message: conflict.message,
            room: row?.schedule_room || row?.room || '—',
            row: conflict.row,
            section_code: row?.section_code,
            time: `${row?.schedule_time_start ?? ''} - ${row?.schedule_time_end ?? ''}`
        };
    });

    return {
        conflictRows,
        conflicts_count: structuredConflicts.length,
        created_count: createdRows.length,
        createdRows,
        errors: structuredErrors.map((error) =>
            `Row ${error.row} (${error.code || 'unknown'}): ${error.message}`),
        provisioned_count: provisionedCount,
        structuredConflicts,
        structuredErrors,
        updated_count: updatedCount,
        updatedRows
    };
}