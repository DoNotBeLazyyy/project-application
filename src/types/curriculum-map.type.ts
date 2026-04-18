export interface CurriculumMapEntry {
    id: string;
    course_id: string;
    course_code: string;
    course_title: string;
    lecture_units: number;
    laboratory_units: number;
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
    yearLevel: number;
    terms: {
        termTypeId: string;
        termTypeLabel: string;
        termTypeCode: string;
        termTypeSequence: number;
        entries: CurriculumMapEntry[];
        totalUnits: number;
    }[];
}