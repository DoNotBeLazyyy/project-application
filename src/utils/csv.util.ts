import { CsvTemplateColumn } from '@type/bulk-import.type';

export interface CsvParseResult {
    rows: Record<string, string>[];
    missingHeaders: string[];
    unknownHeaders: string[];
}

const COMMON_SYNONYMS: Record<string, string[]> = {
    first_name: [
        'first_name', 'first name', 'firstname', 'first', 'given_name', 'given name', 'fname'
    ],
    last_name: [
        'last_name', 'last name', 'lastname', 'last', 'surname', 'family_name', 'family name', 'lname'
    ],
    email: [
        'email', 'email_address', 'email address', 'user_email', 'user email', 'e-mail', 'mail', 'emailaddress'
    ],
    role_code: [
        'role_code', 'role code', 'role', 'roles', 'user_role', 'user role', 'role_name', 'role name', 'user_type', 'user type', 'type', 'rolecode'
    ],
    code: [
        'code', 'entity_code', 'id', 'short_code'
    ],
    name: [
        'name', 'title', 'label', 'entity_name'
    ],
    label: [
        'label', 'title', 'name', 'level_label', 'type_label'
    ],
    department_code: [
        'department_code', 'department code', 'dept_code', 'dept code', 'department', 'dept', 'deptcode'
    ],
    course_code: [
        'course_code', 'course code', 'course', 'subject_code', 'subject code', 'code'
    ],
    course_type_code: [
        'course_type_code', 'course type code', 'course_type', 'course type', 'type'
    ],
    program_code: [
        'program_code', 'program code', 'program', 'degree_program', 'degree program'
    ],
    program_level_code: [
        'program_level_code', 'program level code', 'program_level', 'level_code', 'level'
    ],
    section_code: [
        'section_code', 'section code', 'section'
    ],
    student_number: [
        'student_number', 'student number', 'student_id', 'student id', 'student_no', 'student no', 'id_number', 'id number', 'studentno', 'studentid'
    ],
    term_label: [
        'term_label', 'term label', 'term', 'academic_term', 'academic term', 'semester', 'school_year_term'
    ],
    question_text: [
        'question_text', 'question text', 'question', 'prompt', 'item'
    ],
    question_type: [
        'question_type', 'question type', 'item_type', 'item type', 'type'
    ],
    points: [
        'points', 'point', 'score', 'weight', 'max_score'
    ],
    choices: [
        'choices', 'options', 'answers', 'choice_items'
    ],
    section_codes: [
        'section_codes', 'section codes', 'sections', 'section'
    ],
    allow_conflict: [
        'allow_conflict', 'allow conflict', 'allow_conflicts', 'conflict_allowed'
    ],
    override_prerequisites: [
        'override_prerequisites', 'override prerequisites', 'override_prereqs', 'override_prereq'
    ],
    conflict_reason: [
        'conflict_reason', 'conflict reason', 'reason'
    ],
    lecture_units: [
        'lecture_units', 'lecture units', 'lec_units', 'lec units', 'lecture'
    ],
    laboratory_units: [
        'laboratory_units', 'laboratory units', 'lab_units', 'lab units', 'lab', 'laboratory'
    ],
    credit_hours: [
        'credit_hours', 'credit hours', 'hours'
    ],
    prerequisites: [
        'prerequisites', 'prerequisite', 'prereq', 'prereqs'
    ],
    years_duration: [
        'years_duration', 'years duration', 'duration', 'years'
    ],
    total_units: [
        'total_units', 'total units', 'units'
    ],
    room: [
        'room', 'classroom', 'room_number', 'room number'
    ],
    faculty_email: [
        'faculty_email', 'faculty email', 'instructor_email', 'instructor email', 'teacher_email', 'faculty'
    ],
    max_slots: [
        'max_slots', 'max slots', 'capacity', 'slots'
    ],
    schedule_days: [
        'schedule_days', 'schedule days', 'days', 'day'
    ],
    schedule_time_start: [
        'schedule_time_start', 'schedule start time', 'start_time', 'start time', 'time_start'
    ],
    schedule_time_end: [
        'schedule_time_end', 'schedule end time', 'end_time', 'end time', 'time_end'
    ],
    is_active: [
        'is_active', 'is active', 'active', 'status', 'isactive'
    ],
    is_required: [
        'is_required', 'is required', 'required'
    ],
    is_elective: [
        'is_elective', 'is elective', 'elective'
    ],
    sequence: [
        'sequence', 'order', 'seq'
    ],
    year_level: [
        'year_level', 'year level', 'year', 'level'
    ],
    term_type_code: [
        'term_type_code', 'term type code', 'term_type', 'semester_type'
    ],
    section_title: [
        'section_title', 'section title', 'section_name', 'section'
    ],
    target_mode: [
        'target_mode', 'target mode', 'mode'
    ],
    program_codes: [
        'program_codes', 'program codes', 'programs'
    ],
    min_rating: [
        'min_rating', 'min rating', 'minimum_rating', 'min'
    ],
    max_rating: [
        'max_rating', 'max rating', 'maximum_rating', 'max'
    ]
};

export function normalizeHeader(str: string): string {
    return (str || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

export function detectDelimiter(text: string): string {
    const clean = text.replace(/^\uFEFF/, '');
    const firstLine = clean.split(/\r\n|\r|\n/)[0] || '';
    let commaCount = 0;
    let semicolonCount = 0;
    let tabCount = 0;
    let inQuotes = false;

    for (let i = 0; i < firstLine.length; i++) {
        const c = firstLine[i];
        if (c === '"') {
            inQuotes = !inQuotes;
            continue;
        }
        if (!inQuotes) {
            if (c === ',') commaCount++;
            else if (c === ';') semicolonCount++;
            else if (c === '\t') tabCount++;
        }
    }

    if (tabCount > commaCount && tabCount > semicolonCount) return '\t';
    if (semicolonCount > commaCount) return ';';
    return ',';
}

export function escapeCsvValue(value: string): string {
    if (/[",\r\n\t;]/.test(value)) {
        return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
}

export function splitCsvRecords(rawText: string): string[][] {
    const text = (rawText || '').replace(/^\uFEFF/, '');
    if (!text.trim()) return [];

    const delimiter = detectDelimiter(text);
    const records: string[][] = [];
    let currentRecord: string[] = [];
    let currentValue = '';
    let isQuoted = false;
    let index = 0;

    function pushValue() {
        currentRecord.push(currentValue);
        currentValue = '';
    }

    function pushRecord() {
        pushValue();
        records.push(currentRecord);
        currentRecord = [];
    }

    while (index < text.length) {
        const char = text[index];

        if (isQuoted) {
            if (char === '"') {
                if (text[index + 1] === '"') {
                    currentValue += '"';
                    index += 2;
                    continue;
                }
                isQuoted = false;
                index += 1;
                continue;
            }
            currentValue += char;
            index += 1;
            continue;
        }

        if (char === '"' && currentValue.trim() === '') {
            currentValue = '';
            isQuoted = true;
            index += 1;
            continue;
        }

        if (char === delimiter) {
            pushValue();
            index += 1;
            continue;
        }

        if (char === '\r') {
            if (text[index + 1] === '\n') {
                index += 2;
            } else {
                index += 1;
            }
            pushRecord();
            continue;
        }

        if (char === '\n') {
            pushRecord();
            index += 1;
            continue;
        }

        currentValue += char;
        index += 1;
    }

    if (currentValue !== '' || currentRecord.length) {
        pushRecord();
    }

    return records
        .map((record) => record.map((value) => value.trim()))
        .filter((record) => record.some((value) => value !== ''));
}

export function matchColumnHeader(header: string, col: CsvTemplateColumn): boolean {
    const hRaw = (header || '').trim().toLowerCase();
    const hNorm = normalizeHeader(header);
    if (!hNorm) return false;

    // 1. Exact match on key or label
    if (hRaw === col.key.trim().toLowerCase() || hRaw === col.label.trim().toLowerCase()) {
        return true;
    }

    // 2. Normalized match on key or label
    if (hNorm === normalizeHeader(col.key) || hNorm === normalizeHeader(col.label)) {
        return true;
    }

    // 3. Explicit aliases on the column definition
    if (col.aliases && col.aliases.length > 0) {
        for (const alias of col.aliases) {
            if (hRaw === alias.trim().toLowerCase() || hNorm === normalizeHeader(alias)) {
                return true;
            }
        }
    }

    // 4. Built-in synonyms for known keys
    const synonyms = COMMON_SYNONYMS[col.key] || [];
    for (const syn of synonyms) {
        if (hRaw === syn || hNorm === normalizeHeader(syn)) {
            return true;
        }
    }

    return false;
}

export function isHintRecord(values: string[], matchedColumns: (CsvTemplateColumn | null)[]): boolean {
    const nonEmpty = values.filter((v) => v !== undefined && v !== '');
    if (!nonEmpty.length) return false;

    // If multiple values explicitly start with "e.g." it's definitely a hint row
    const egCount = values.filter((v) => /^e\.g\.?/i.test((v || '').trim())).length;
    if (egCount >= 1 && egCount >= Math.min(2, nonEmpty.length)) {
        return true;
    }

    const comparableHints = matchedColumns.filter((col, index) => col?.hint && values[index] !== undefined);
    if (!comparableHints.length) return false;

    return matchedColumns.every((col, index) => {
        if (!col?.hint) return true;
        const val = (values[index] ?? '').trim().toLowerCase();
        const hintVal = col.hint.trim().toLowerCase();
        return val === hintVal || val === hintVal.replace(/^e\.g\.?\s*/i, '');
    });
}

export function cleanSampleFromHint(hint?: string): string {
    if (!hint) return '';
    let val = hint.replace(/^e\.g\.?\s*/i, '').trim();
    if (val.includes('|')) {
        val = val.split('|')[0].trim().replace(/\*$/, '');
    } else if (val.includes(',') && !val.toLowerCase().includes('optional')) {
        val = val.split(',')[0].trim();
    }
    val = val.replace(/\s*\(optional.*?\)$/i, '').trim();
    return val;
}

export function generateTemplateCsv(columns: CsvTemplateColumn[]): string {
    const activeCols = columns.filter(Boolean);
    const headers = activeCols.map((col) => escapeCsvValue(col.label || col.key));
    const sampleRow = activeCols.map((col) => {
        const val = col.sample ?? cleanSampleFromHint(col.hint);
        return escapeCsvValue(val);
    });

    return [headers.join(','), sampleRow.join(',')].join('\n');
}
