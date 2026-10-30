import { bulkCreateCurriculumMap, deleteCurriculumMapEntry, updateCurriculumMapEntry } from '@services/curriculum-map.service';
import { getDepartments } from '@services/department.service';
import { getProgramLevels } from '@services/program/program-level.service';
import { callRpc } from '@services/supabase.wrapper';
import { BulkImportResult } from '@type/bulk-import.type';
import { CurriculumMapBulkRow } from '@type/curriculum-map.type';
import { CommonListResDto, SortStringDto } from '@type/http.type';
import {
    ProgramBulkImportResult, ProgramBulkRow, ProgramFilterValues, ProgramFormValues, ProgramListRow, ProgramOption
} from '@type/program/program.type';
import { ServiceResult } from '@type/service.type';
import { generateProgramCode } from '@utils/entity-code.util';
import { nullIfBlank } from '@utils/uuid.util';

export async function listPrograms(
    page: number,
    size: number,
    search: string,
    sort: SortStringDto[],
    filters: ProgramFilterValues | null
): Promise<ServiceResult<CommonListResDto<ProgramListRow>>> {
    return callRpc<CommonListResDto<ProgramListRow>>('fn_list_programs_json', {
        p_page: page,
        p_search: search || null,
        p_size: size,
        p_sort: sort.length > 0
            ? sort
            : null,
        p_department_ids: filters?.department_ids?.length
            ? filters.department_ids
            : null,
        p_program_level_ids: filters?.program_level_ids?.length
            ? filters.program_level_ids
            : null,
        p_is_active: filters?.is_active === 'true'
            ? true
            : filters?.is_active === 'false'
                ? false
                : null
    });
}

export async function getProgramById(
    programId: string
): Promise<ServiceResult<ProgramFormValues>> {
    return callRpc<ProgramFormValues>('fn_get_program_by_id', {
        p_program_id: programId
    });
}

export async function getPrograms(): Promise<ServiceResult<ProgramOption[]>> {
    return callRpc<ProgramOption[]>('fn_get_programs');
}

function resolveTermTypeCode(codeOrLabel?: string): string {
    if (!codeOrLabel) return '';
    const clean = codeOrLabel.trim();
    const upper = clean.toUpperCase().replace(/\s+/g, '_');
    const lower = clean.toLowerCase();
    if (lower === '1st semester' || lower === '1st_semester' || lower === 'first semester' || upper === '1ST_SEM' || upper === '1ST-SEM') return '1ST_SEM';
    if (lower === '2nd semester' || lower === '2nd_semester' || lower === 'second semester' || upper === '2ND_SEM' || upper === '2ND-SEM') return '2ND_SEM';
    if (lower === 'summer' || lower === 'summer term' || upper === 'SUMMER') return 'SUMMER';
    return upper;
}

export async function createProgram(
    params: ProgramFormValues
): Promise<ServiceResult<null>> {
    const result = await callRpc<{ id?: string; program_id?: string; code?: string }>('fn_create_program', {
        p_code: params.code,
        p_department_id: nullIfBlank(params.department_id),
        p_description: params.description || null,
        p_is_active: params.is_active,
        p_name: params.name,
        p_program_level_id: nullIfBlank(params.program_level_id),
        p_total_units: params.total_units
            ? Number(params.total_units)
            : null,
        p_years_duration: Number(params.years_duration)
    });

    if (!result.error) {
        const programCode = result.data?.code || params.code;
        const programId = result.data?.id || result.data?.program_id;

        // STEP 1: Delete any pending deleted curriculum map entries first (if any)
        if (params.pending_deleted_curriculum_ids && params.pending_deleted_curriculum_ids.length > 0) {
            const realDeletedIds = params.pending_deleted_curriculum_ids.filter((id) => !id.startsWith('temp-'));
            if (realDeletedIds.length > 0) {
                await Promise.allSettled(
                    realDeletedIds.map((id) => deleteCurriculumMapEntry(id))
                );
            }
        }

        // STEP 2: Bulk create all curriculum entries after program is created via SINGLE API call
        if (params.curriculum_entries && params.curriculum_entries.length > 0) {
            const bulkEntries: CurriculumMapBulkRow[] = params.curriculum_entries.map((entry) => ({
                program_id: programId,
                program_code: programCode,
                course_id: entry.course_id,
                course_code: entry.course_code || '',
                year_level: String(entry.year_level),
                term_type_id: entry.term_type_id,
                term_type_code: resolveTermTypeCode(entry.term_type_code || entry.term_type_label),
                school_year_id: entry.school_year_id || params.school_year_id || null,
                school_year_code: '',
                sequence: String(entry.sequence ?? 1),
                is_elective: String(Boolean(entry.is_elective)),
                lecture_units: String(entry.lecture_units ?? 0),
                laboratory_units: String(entry.laboratory_units ?? 0),
                units: String(entry.units ?? entry.total_units ?? 0),
                type_units: entry.type_units
            }));
            const currRes = await bulkCreateCurriculumMap(bulkEntries);
            if (currRes.errors && currRes.errors.length > 0) {
                return {
                    data: null,
                    error: {
                        message: `Program saved, but failed to save curriculum map entries: ${currRes.errors.join('; ')}`
                    } as any
                };
            }
        }
    }

    return { data: null, error: result.error };
}

export async function updateProgram(
    programId: string,
    params: ProgramFormValues
): Promise<ServiceResult<null>> {
    const code = params.code?.trim() || generateProgramCode(params.name || '');
    const result = await callRpc<null>('fn_update_program', {
        p_code: code,
        p_department_id: nullIfBlank(params.department_id),
        p_description: params.description || null,
        p_is_active: params.is_active,
        p_name: params.name,
        p_program_id: programId,
        p_program_level_id: nullIfBlank(params.program_level_id),
        p_total_units: params.total_units
            ? Number(params.total_units)
            : null,
        p_years_duration: Number(params.years_duration)
    });

    if (!result.error) {
        // STEP 1: Delete all pending deleted curriculum map entries FIRST
        if (params.pending_deleted_curriculum_ids && params.pending_deleted_curriculum_ids.length > 0) {
            const realDeletedIds = params.pending_deleted_curriculum_ids.filter((id) => !id.startsWith('temp-'));
            if (realDeletedIds.length > 0) {
                await Promise.allSettled(
                    realDeletedIds.map((id) => deleteCurriculumMapEntry(id))
                );
            }
        }

        // STEP 2: Bulk create all new/imported entries in ONE SINGLE API call AFTER deletion completes
        if (params.curriculum_entries && params.curriculum_entries.length > 0) {
            const tempEntries = params.curriculum_entries.filter((entry) => entry.id && entry.id.startsWith('temp-'));
            if (tempEntries.length > 0) {
                const bulkEntries: CurriculumMapBulkRow[] = tempEntries.map((entry) => ({
                    program_id: programId,
                    program_code: params.code,
                    course_id: entry.course_id,
                    course_code: entry.course_code || '',
                    year_level: String(entry.year_level),
                    term_type_id: entry.term_type_id,
                    term_type_code: resolveTermTypeCode(entry.term_type_code || entry.term_type_label),
                    school_year_id: entry.school_year_id || params.school_year_id || null,
                    school_year_code: '',
                    sequence: String(entry.sequence ?? 1),
                    is_elective: String(Boolean(entry.is_elective)),
                    lecture_units: String(entry.lecture_units ?? 0),
                    laboratory_units: String(entry.laboratory_units ?? 0),
                    units: String(entry.units ?? entry.total_units ?? 0),
                    type_units: entry.type_units
                }));
                const currRes = await bulkCreateCurriculumMap(bulkEntries);
                if (currRes.errors && currRes.errors.length > 0) {
                    return {
                        data: null,
                        error: {
                            message: `Program updated, but failed to save curriculum entries: ${currRes.errors.join('; ')}`
                        } as any
                    };
                }
            }

            const existingEntries = params.curriculum_entries.filter((entry) => entry.id && !entry.id.startsWith('temp-'));
            if (existingEntries.length > 0) {
                const updateResults = await Promise.all(
                    existingEntries.map((entry) =>
                        updateCurriculumMapEntry(
                            entry.id || '',
                            {
                                course_id: entry.course_id,
                                is_elective: Boolean(entry.is_elective),
                                sequence: String(entry.sequence ?? 1),
                                term_type_id: entry.term_type_id,
                                year_level: String(entry.year_level),
                                lecture_units: String(entry.lecture_units ?? 0),
                                laboratory_units: String(entry.laboratory_units ?? 0),
                                units: String(entry.units ?? entry.total_units ?? 0),
                                type_units: typeof entry.type_units === 'string' ? JSON.parse(entry.type_units) : entry.type_units
                            },
                            entry.school_year_id || params.school_year_id
                        )
                    )
                );
                const firstErr = updateResults.find((r) => r.error);
                if (firstErr) {
                    return {
                        data: null,
                        error: {
                            message: `Program updated, but failed to update some curriculum entries: ${firstErr.error?.message}`
                        } as any
                    };
                }
            }
        }
    }

    return result;
}

export async function deleteProgram(
    programId: string
): Promise<ServiceResult<null>> {
    return callRpc<null>('fn_delete_program', {
        p_program_id: programId
    });
}

export async function bulkDeletePrograms(
    programIds: string[]
): Promise<ServiceResult<null>> {
    return callRpc<null>('fn_bulk_delete_programs', {
        p_program_ids: programIds
    });
}

export async function bulkCreatePrograms(
    programs: ProgramBulkRow[]
): Promise<BulkImportResult> {
    const uniqueProgramsMap = new Map<string, ProgramBulkRow>();
    // CSV row number (1-based) of the first row of every unique program code
    const programRowNumbers = new Map<string, number>();
    const curriculumRows: CurriculumMapBulkRow[] = [];
    // CSV row number (1-based) of every curriculum entry, to remap its errors
    const curriculumRowNumbers: number[] = [];
    const existingCodes: string[] = [];
    // Rows repeating a program (one per curriculum course) must share one generated code
    const generatedCodesByName = new Map<string, string>();
    const normalizedPrograms = programs.map((row) => {
        const nameKey = (row.name || '').trim()
            .toLowerCase();
        const code = row.code?.trim()
            || generatedCodesByName.get(nameKey)
            || generateProgramCode(row.name || '', existingCodes);
        if (code && !existingCodes.includes(code)) {
            existingCodes.push(code);
        }
        if (code && !row.code?.trim()) {
            generatedCodesByName.set(nameKey, code);
        }
        return {
            ...row,
            code
        };
    });

    normalizedPrograms.forEach(function(row, index) {
        const codeKey = row.code?.trim().toUpperCase();
        if (codeKey && !uniqueProgramsMap.has(codeKey)) {
            uniqueProgramsMap.set(codeKey, row);
            programRowNumbers.set(codeKey, index + 1);
        }

        if (row.course_code?.trim()) {
            const cCode = row.course_code.trim();
            curriculumRows.push({
                program_code: row.code?.trim() || '',
                course_code: cCode,
                year_level: String(row.year_level || '1'),
                term_type_code: resolveTermTypeCode(row.term_type_code || '1ST_SEM'),
                school_year_code: String(row.school_year_code || ''),
                sequence: String(row.sequence || '1'),
                is_elective: String(row.is_elective ?? 'false')
            });
            curriculumRowNumbers.push(index + 1);
        }
    });

    // fn_bulk_create_programs matches department / program level codes exactly and casts
    // years_duration, total_units and is_active directly - a blank or malformed value aborts
    // the whole batch. Resolve the codes (code or name, any case) and validate the values here.
    const [departmentsResult, programLevelsResult] = await Promise.all([getDepartments(), getProgramLevels()]);
    const findByCodeOrLabel = function<T extends { code: string; label: string }>(items: T[], value?: string) {
        const key = (value || '').trim()
            .toLowerCase();
        return items.find((item) =>
            item.code.trim()
                .toLowerCase() === key || item.label.trim()
                .toLowerCase() === key);
    };

    const errors: string[] = [];
    const sentRowNumbers: number[] = [];
    const uniqueProgramRows: ProgramBulkRow[] = [];

    uniqueProgramsMap.forEach(function(row, codeKey) {
        const rowNumber = programRowNumbers.get(codeKey) ?? 0;
        const department = findByCodeOrLabel(departmentsResult.data ?? [], row.department_code);
        const programLevel = findByCodeOrLabel(programLevelsResult.data ?? [], row.program_level_code);
        const yearsDuration = Number(String(row.years_duration ?? '').trim() || NaN);
        const totalUnits = String(row.total_units ?? '').trim();
        const isActive = String(row.is_active ?? '').trim()
            .toLowerCase();

        let message = '';
        if (!Number.isInteger(yearsDuration) || yearsDuration < 1 || yearsDuration > 8) {
            message = 'Years duration must be a whole number from 1 to 8';
        } else if (totalUnits !== '' && (isNaN(Number(totalUnits)) || Number(totalUnits) < 0)) {
            message = 'Total units must be a number of 0 or more';
        } else if (isActive !== '' && !['true', 'false', 'yes', 'no', '1', '0'].includes(isActive)) {
            message = 'Is active must be true or false';
        }

        if (message) {
            errors.push(`Row ${rowNumber} (${row.code || 'unknown'}): ${message}`);
            return;
        }

        uniqueProgramRows.push({
            ...row,
            department_code: department?.code ?? row.department_code,
            program_level_code: programLevel?.code ?? row.program_level_code,
            years_duration: String(yearsDuration),
            total_units: totalUnits,
            // Omitted when blank so the function defaults it to true
            is_active: isActive === ''
                ? undefined
                : String(['true', 'yes', '1'].includes(isActive))
        });
        sentRowNumbers.push(rowNumber);
    });

    let provisionedCount = 0;
    if (uniqueProgramRows.length > 0) {
        const result = await callRpc<ProgramBulkImportResult>('fn_bulk_create_programs', {
            p_programs: uniqueProgramRows
        });

        if (result.error) {
            return { provisioned_count: 0, errors: [...errors, result.error.message] };
        }

        errors.push(...(result.data?.errors ?? []).map((error) =>
            `Row ${sentRowNumbers[error.row - 1] ?? error.row} (${error.code || 'unknown'}): ${error.message}`
        ));
        provisionedCount = result.data?.provisioned_count ?? 0;
    }

    if (curriculumRows.length > 0) {
        const currResult = await bulkCreateCurriculumMap(curriculumRows);
        if (currResult.errors && currResult.errors.length > 0) {
            errors.push(...currResult.errors.map((error) =>
                error.replace(/^Row (\d+)/, (_match, row) =>
                    `Row ${curriculumRowNumbers[Number(row) - 1] ?? row} curriculum`)));
        }
    }

    return {
        provisioned_count: provisionedCount,
        errors
    };
}