import { callRpc } from '@services/supabase.wrapper';
import { BulkImportResult } from '@type/bulk-import.type';
import { CurriculumMapBulkRow, CurriculumMapEntry, CurriculumMapFormValues } from '@type/curriculum-map.type';
import { ServiceResult } from '@type/service.type';

export async function getCurriculumMap(
    programId: string,
    schoolYearId?: string
): Promise<ServiceResult<CurriculumMapEntry[]>> {
    return callRpc<CurriculumMapEntry[]>('fn_get_curriculum_map', {
        p_program_id: programId,
        p_school_year_id: schoolYearId || null
    });
}

export async function createCurriculumMapEntry(
    programId: string,
    params: CurriculumMapFormValues,
    schoolYearId?: string
): Promise<ServiceResult<null>> {
    return callRpc<null>('fn_create_curriculum_map_entry', {
        p_program_id: programId,
        p_course_id: params.course_id,
        p_year_level: Number(params.year_level),
        p_term_type_id: params.term_type_id,
        p_school_year_id: schoolYearId || null,
        p_sequence: Number(params.sequence),
        p_is_elective: params.is_elective,
        p_lecture_units: params.lecture_units !== undefined && params.lecture_units !== ''
            ? Number(params.lecture_units)
            : null,
        p_laboratory_units: params.laboratory_units !== undefined && params.laboratory_units !== ''
            ? Number(params.laboratory_units)
            : null,
        p_units: params.units !== undefined && params.units !== ''
            ? Number(params.units)
            : null,
        p_type_units: params.type_units || null
    });
}

export async function updateCurriculumMapEntry(
    curriculumMapId: string,
    params: CurriculumMapFormValues,
    schoolYearId?: string
): Promise<ServiceResult<null>> {
    return callRpc<null>('fn_update_curriculum_map_entry', {
        p_curriculum_map_id: curriculumMapId,
        p_course_id: params.course_id,
        p_year_level: Number(params.year_level),
        p_term_type_id: params.term_type_id,
        p_school_year_id: schoolYearId || null,
        p_sequence: Number(params.sequence),
        p_is_elective: params.is_elective,
        p_lecture_units: params.lecture_units !== undefined && params.lecture_units !== ''
            ? Number(params.lecture_units)
            : null,
        p_laboratory_units: params.laboratory_units !== undefined && params.laboratory_units !== ''
            ? Number(params.laboratory_units)
            : null,
        p_units: params.units !== undefined && params.units !== ''
            ? Number(params.units)
            : null,
        p_type_units: params.type_units || null
    });
}

export async function deleteCurriculumMapEntry(
    curriculumMapId: string
): Promise<ServiceResult<null>> {
    return callRpc<null>('fn_delete_curriculum_map_entry', {
        p_curriculum_map_id: curriculumMapId
    });
}

const BOOLEAN_TEXTS = ['true', 'false', 'yes', 'no', 'y', 'n', '1', '0', 't', 'f', 'on', 'off'];

/**
 * fn_bulk_create_curriculum_map casts year_level/sequence/units/is_elective directly, so a
 * blank or malformed value raises and aborts the whole batch. Validate those here, drop
 * blank optional values (the function then applies its defaults) and keep the bad rows out.
 *
 * @param entry - One row bound for the bulk function.
 * @returns The cleaned row, or the reason it cannot be imported.
 */
function sanitizeCurriculumRow(entry: CurriculumMapBulkRow): { row?: CurriculumMapBulkRow; message?: string } {
    const yearLevel = Number(String(entry.year_level ?? '')
        .trim());
    if (!Number.isInteger(yearLevel) || yearLevel < 1 || yearLevel > 6) {
        return { message: 'Year level must be a whole number from 1 to 6' };
    }

    const row: CurriculumMapBulkRow = { ...entry, year_level: String(yearLevel) };

    const sequence = String(entry.sequence ?? '')
        .trim();
    if (sequence === '') {
        delete (row as Partial<CurriculumMapBulkRow>).sequence;
    }
    else if (!Number.isInteger(Number(sequence)) || Number(sequence) < 1 || Number(sequence) > 32767) {
        return { message: 'Sequence must be a whole number of 1 or more' };
    }

    const isElective = String(entry.is_elective ?? '')
        .trim()
        .toLowerCase();
    if (isElective === '') {
        delete (row as Partial<CurriculumMapBulkRow>).is_elective;
    }
    else if (!BOOLEAN_TEXTS.includes(isElective)) {
        return { message: 'Is elective must be true or false' };
    }

    for (const key of ['lecture_units', 'laboratory_units', 'units'] as const) {
        const value = String(entry[key] ?? '')
            .trim();
        if (value === '') {
            delete row[key];
        }
        else if (isNaN(Number(value)) || Number(value) < 0) {
            return { message: 'Units must be numbers of 0 or more' };
        }
    }

    return { row };
}

export async function bulkCreateCurriculumMap(
    entries: CurriculumMapBulkRow[]
): Promise<BulkImportResult> {
    const errors: string[] = [];
    // Original 1-based row number of every entry actually sent, to remap server errors
    const sentRowNumbers: number[] = [];
    const sentEntries: CurriculumMapBulkRow[] = [];

    entries.forEach((entry, index) => {
        const { message, row } = sanitizeCurriculumRow(entry);
        if (row) {
            sentEntries.push(row);
            sentRowNumbers.push(index + 1);
        }
        else {
            errors.push(`Row ${index + 1} (${entry.course_code || 'unknown'}): ${message}`);
        }
    });

    if (!sentEntries.length) {
        return { provisioned_count: 0, errors };
    }

    const result = await callRpc<{
        provisioned_count: number;
        errors: { row: number; code: string; message: string }[];
    }>('fn_bulk_create_curriculum_map', { p_entries: sentEntries });

    if (result.error) {
        return { provisioned_count: 0, errors: [...errors, result.error.message] };
    }

    return {
        provisioned_count: result.data?.provisioned_count ?? 0,
        errors: [
            ...errors,
            ...(result.data?.errors ?? []).map((error) =>
                `Row ${sentRowNumbers[error.row - 1] ?? error.row} (${error.code || 'unknown'}): ${error.message}`)
        ]
    };
}