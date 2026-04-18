export interface CourseListRow {
    id: string;
    code: string;
    title: string;
    description: string | null;
    department_id: string;
    department_name: string;
    course_type_id: string;
    course_type_label: string;
    lecture_units: number;
    laboratory_units: number;
    total_units: number;
    credit_hours: number | null;
    is_active: boolean;
    total_count: number;
}

export interface PrerequisiteRow {
    course_id: string;
    prerequisite_type: 'Required' | 'Co-requisite' | 'Recommended';
    prerequisite_kind: 'course' | 'standing';
    year_level_required: string;
    minimum_grade: string;
    [key: string]: unknown;
}

export interface CourseFormValues {
    code: string;
    title: string;
    description: string;
    department_id: string;
    course_type_id: string;
    is_split: boolean;
    lecture_units: string;
    laboratory_units: string;
    credit_hours: string;
    is_active: boolean;
    prerequisites: PrerequisiteRow[];
}

export interface CourseFilterValues {
    department_ids: string[];
    course_type_ids: string[];
    is_active: 'All' | 'true' | 'false';
}

export interface CourseOption {
    id: string;
    code: string;
    label: string;
}

export interface CourseBulkRow {
    code: string;
    title: string;
    department_code: string;
    course_type_code: string;
    lecture_units: string;
    laboratory_units: string;
    credit_hours: string;
    description: string;
    is_active: string;
    prerequisites: string;
}