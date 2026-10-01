import {
    createGradingComponent, deleteGradingComponent, listGradingComponents, listGradingPeriodsBySection
} from '@services/faculty.service';
import { callRpc } from '@services/supabase.wrapper';
import { BulkImportError, DetailedBulkImportResult } from '@type/bulk-import.type';
import { CommonListResDto, SortStringDto } from '@type/http.type';
import {
    DayOfWeek,
    SectionBulkRow, SectionFilterValues, SectionFormValues, SectionGradingComponentOverride, SectionGradingPeriodOverride, SectionListRow, SectionOption, SectionScheduleBlock, SectionScheduleSlot
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

        if (map.has(key)) {
            const existing = map.get(key)!;
            if (!existing.days.includes(slot.day_of_week)) {
                existing.days.push(slot.day_of_week);
            }
        } else {
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

export async function saveSectionSchedules(
    sectionId: string,
    schedules: SectionScheduleSlot[]
): Promise<ServiceResult<null>> {
    return callRpc<null>('fn_save_section_schedules', {
        p_section_id: sectionId,
        p_schedules: schedules
    });
}

export interface TermOption {
    id: string;
    label: string;
    is_active_academic_year?: boolean;
}

export interface FacultyOption {
    id: string;
    full_name: string;
    role_label: string;
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
            : null
    });
}

export async function getSectionById(
    sectionId: string
): Promise<ServiceResult<SectionFormValues>> {
    return callRpc<SectionFormValues>('fn_get_section_by_id', {
        p_section_id: sectionId
    });
}

export async function getSections(): Promise<ServiceResult<SectionOption[]>> {
    return callRpc<SectionOption[]>('fn_get_sections');
}

export async function getTerms(): Promise<ServiceResult<TermOption[]>> {
    return callRpc<TermOption[]>('fn_get_terms');
}

export async function getFacultyOptions(): Promise<ServiceResult<FacultyOption[]>> {
    return callRpc<FacultyOption[]>('fn_get_users_by_roles', {
        p_role_codes: ['Faculty']
    });
}

export async function createSection(
    params: SectionFormValues
): Promise<ServiceResult<{ id?: string }>> {
    const code = params.section_code && params.section_code.trim() !== ''
        ? params.section_code
        : `SEC-${Math.floor(1000 + Math.random() * 9000)}`;

    return callRpc<{ id?: string }>('fn_create_section', {
        p_term_id: nullIfBlank(params.term_id),
        p_program_id: nullIfBlank(params.program_id),
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
        p_program_id: nullIfBlank(params.program_id),
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

export async function copySectionSetupToSections(
    sourceSectionId: string,
    targetSectionIds: string[]
): Promise<ServiceResult<null>> {
    return callRpc<null>('fn_copy_section_setup_to_sections', {
        p_source_section_id: sourceSectionId,
        p_target_section_ids: targetSectionIds
    });
}

function parseDaysOfWeek(str?: string): DayOfWeek[] {
    if (!str || !str.trim()) return [];
    const tokens = str.split(/[,;\s]+/).map((t) => t.trim().toLowerCase()).filter(Boolean);
    const validDays: DayOfWeek[] = [];

    const map: Record<string, DayOfWeek> = {
        fri: 'Friday',
        friday: 'Friday',
        mon: 'Monday',
        monday: 'Monday',
        sat: 'Saturday',
        saturday: 'Saturday',
        sun: 'Sunday',
        sunday: 'Sunday',
        thu: 'Thursday',
        thur: 'Thursday',
        thurs: 'Thursday',
        thursday: 'Thursday',
        tue: 'Tuesday',
        tues: 'Tuesday',
        tuesday: 'Tuesday',
        wed: 'Wednesday',
        wednesday: 'Wednesday'
    };

    for (const tok of tokens) {
        if (map[tok] && !validDays.includes(map[tok])) {
            validDays.push(map[tok]);
        }
    }
    return validDays;
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
                        ? item.components.map((c: any) => ({
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
        : (trimmed.includes('(') ? /;/ : /,/);
    const entryStrings = trimmed.split(delimiter).map((s) => s.trim()).filter(Boolean);

    const periods: SectionGradingPeriodOverride[] = [];

    entryStrings.forEach((entryStr, pIdx) => {
        const periodMatch = entryStr.match(/^([^(:]+)(?::(\d+(?:\.\d+)?))?(?:\(([^)]+)\))?$/);

        if (periodMatch) {
            const periodName = periodMatch[1].trim();
            const periodWeight = periodMatch[2] ? parseFloat(periodMatch[2]) : 0;
            const componentsStr = periodMatch[3];

            const components: SectionGradingComponentOverride[] = [];

            if (componentsStr && componentsStr.trim()) {
                const compTokens = componentsStr.split(/[,;]/).map((c) => c.trim()).filter(Boolean);
                compTokens.forEach((compToken) => {
                    const compMatch = compToken.match(/^([^:]+)(?::(\d+(?:\.\d+)?))?$/);
                    if (compMatch) {
                        components.push({
                            name: compMatch[1].trim(),
                            weight: compMatch[2] ? parseFloat(compMatch[2]) : 0
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
    const mappedSections = sections.map((row, idx) => {
        const code = row.section_code && row.section_code.trim() !== ''
            ? row.section_code.trim()
            : `${row.course_code ? row.course_code.trim().toUpperCase().replace(/[^A-Z0-9]/g, '') : 'SEC'}-${Math.floor(100 + Math.random() * 900)}${idx + 1}`;
        return {
            ...row,
            section_code: code,
            status: row.status && row.status.trim() !== ''
                ? row.status.trim()
                : 'Open'
        };
    });

    const result = await callRpc<{
        provisioned_count: number;
        created_count?: number;
        updated_count?: number;
        created_rows?: any[];
        updated_rows?: any[];
        errors: BulkImportError[];
    }>('fn_bulk_create_sections', { p_sections: mappedSections });

    let provisionedCount = 0;
    let createdCount = 0;
    let updatedCount = 0;
    let createdRows: any[] = [];
    let updatedRows: any[] = [];
    let structuredErrors: BulkImportError[] = [];
    const structuredConflicts: BulkImportError[] = [];

    if (!result.error && result.data) {
        provisionedCount = result.data.provisioned_count ?? 0;
        createdCount = result.data.created_count ?? provisionedCount;
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

    const facultyScheduleTracker: {
        row: number;
        course_code: string;
        section_code: string;
        faculty_email: string;
        days: DayOfWeek[];
        start: string;
        end: string;
    }[] = [];

    const conflictRows: any[] = [];

    if (provisionedCount > 0) {
        const sectionsRes = await getSections();
        const allSections = sectionsRes.data || [];

        for (let i = 0; i < mappedSections.length; i++) {
            const row = mappedSections[i];
            const hasError = structuredErrors.some((e) => e.row === i + 1);
            if (hasError) continue;

            const createdSec = allSections.find((s) => s.section_code === row.section_code);
            if (!createdSec) continue;

            // 1. Process Schedule & Conflict Detection
            const days = parseDaysOfWeek(row.schedule_days);
            if (days.length > 0 && row.schedule_time_start && row.schedule_time_end) {
                const slots: SectionScheduleSlot[] = days.map((day) => ({
                    day_of_week: day,
                    room: row.schedule_room || row.room || null,
                    time_end: row.schedule_time_end!.slice(0, 5),
                    time_start: row.schedule_time_start!.slice(0, 5)
                }));
                await saveSectionSchedules(createdSec.id, slots);

                if (row.faculty_email) {
                    const email = row.faculty_email.trim().toLowerCase();
                    const start = row.schedule_time_start.slice(0, 5);
                    const end = row.schedule_time_end.slice(0, 5);

                    const conflict = facultyScheduleTracker.find((prev) =>
                        prev.faculty_email === email
                        && prev.days.some((d) => days.includes(d))
                        && ((start >= prev.start && start < prev.end) || (end > prev.start && end <= prev.end) || (start <= prev.start && end >= prev.end))
                    );

                    if (conflict) {
                        structuredConflicts.push({
                            code: 'FACULTY_SCHEDULE_CONFLICT',
                            message: `Faculty ${row.faculty_email} double-booked across ${row.course_code} (${row.section_code}) and Row ${conflict.row} (${conflict.course_code}) on ${row.schedule_days} ${start}-${end}`,
                            row: i + 1
                        });
                        conflictRows.push({
                            conflict_with: `Row #${conflict.row} (${conflict.course_code} - ${conflict.section_code})`,
                            course_code: row.course_code,
                            days: row.schedule_days,
                            faculty_email: row.faculty_email,
                            message: `Faculty double-booked with Row #${conflict.row} (${conflict.section_code}) on ${row.schedule_days} ${start}-${end}`,
                            room: row.schedule_room || row.room || '—',
                            row: i + 1,
                            section_code: row.section_code,
                            time: `${start} - ${end}`
                        });
                    }

                    facultyScheduleTracker.push({
                        course_code: row.course_code,
                        days,
                        end,
                        faculty_email: email,
                        row: i + 1,
                        section_code: row.section_code,
                        start
                    });
                }
            }

            // 2. Process Preset Section Copy
            const presetVal = (row.preset_section || row.source_section_code || '').trim();
            if (presetVal) {
                const lowPreset = presetVal.toLowerCase();
                const sourceSec = allSections.find((s) =>
                    s.section_code.toLowerCase() === lowPreset
                    || s.label.toLowerCase() === lowPreset
                    || (s.section_code + ' - ' + s.label).toLowerCase() === lowPreset
                    || s.id === presetVal
                );
                if (sourceSec) {
                    await copySectionSetupToSections(sourceSec.id, [createdSec.id]);
                }
            }

            // 3. Process Custom Grading Periods Schema
            if (row.grading_periods && row.grading_periods.trim()) {
                const customPeriods = parseGradingPeriodsSchema(row.grading_periods);
                if (customPeriods.length > 0) {
                    const secPeriodsRes = await listGradingPeriodsBySection(createdSec.id);
                    const existingPeriods = secPeriodsRes.data || [];

                    for (let pIdx = 0; pIdx < customPeriods.length; pIdx++) {
                        const customP = customPeriods[pIdx];
                        const matchPeriod = existingPeriods.find(
                            (ep) => ep.sequence === customP.sequence
                                || ep.name.toLowerCase() === customP.name.toLowerCase()
                        ) || existingPeriods[pIdx];

                        if (matchPeriod && customP.components.length > 0) {
                            const existingCompsRes = await listGradingComponents(createdSec.id, matchPeriod.id);
                            if (existingCompsRes.data) {
                                for (const c of existingCompsRes.data) {
                                    await deleteGradingComponent(c.id);
                                }
                            }
                            for (const c of customP.components) {
                                await createGradingComponent(createdSec.id, matchPeriod.id, {
                                    name: c.name,
                                    weight: c.weight
                                });
                            }
                        }
                    }
                }
            }
        }
    }

    const conflictingRowNumbers = new Set(structuredConflicts.map((c) => c.row));
    const nonConflictingCreatedRows = createdRows.filter((r) => !conflictingRowNumbers.has(r.row));

    return {
        conflictRows,
        conflicts_count: structuredConflicts.length,
        created_count: nonConflictingCreatedRows.length,
        createdRows: nonConflictingCreatedRows,
        errors: structuredErrors.map((error) =>
            `Row ${error.row} (${error.code || 'unknown'}): ${error.message}`),
        provisioned_count: nonConflictingCreatedRows.length + updatedCount,
        structuredConflicts,
        structuredErrors,
        updated_count: updatedCount,
        updatedRows
    };
}