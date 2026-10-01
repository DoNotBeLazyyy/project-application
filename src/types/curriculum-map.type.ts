export interface CurriculumMapEntry {
    id: string;
    course_id: string;
    course_code: string;
    course_title: string;
    base_code?: string;
    course_type_id?: string;
    course_type_code?: string;
    course_type_label?: string;
    lecture_units: number;
    laboratory_units: number;
    units?: number;
    type_units?: Record<string, number>;
    total_units: number;
    year_level: number;
    term_type_id: string;
    term_type_label: string;
    term_type_code: string;
    term_type_sequence: number;
    school_year_id: string | null;
    sequence: number;
    is_elective: boolean;
    prerequisites: { code: string }[];
}

export interface CurriculumMapFormValues {
    course_id: string;
    year_level: string;
    term_type_id: string;
    sequence: string;
    is_elective: boolean;
    lecture_units?: string;
    laboratory_units?: string;
    units?: string;
    type_units?: Record<string, number>;
}

export interface CurriculumMapBulkRow {
    program_code: string;
    course_code: string;
    year_level: string;
    term_type_code: string;
    school_year_code: string;
    sequence: string;
    is_elective: string;
}

export interface CurriculumMapGrouped {
    key: string;
    yearLevel: number;
    isSummer: boolean;
    label: string;
    terms: {
        termTypeId: string;
        termTypeLabel: string;
        termTypeCode: string;
        termTypeSequence: number;
        entries: CurriculumMapEntry[];
        totalUnits: number;
    }[];
}