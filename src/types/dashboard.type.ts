import { RiskLevel } from '@type/analytics.type';

export interface DashboardTerm {
    term_id: string;
    term_label: string;
    status: string;
}

export interface DashboardProgramDistribution {
    program_code: string;
    program_name: string;
    student_count: number;
}

export interface DeanDashboardStats {
    total_departments: number;
    total_programs: number;
    total_courses: number;
    total_faculty: number;
    sections_this_term: number;
    unassigned_sections: number;
    enrolled_students: number;
    schedule_conflicts: number;
    at_risk_students: number;
}

export interface DeanUnassignedSection {
    section_id: string;
    section_code: string;
    course_code: string;
    course_title: string;
    enrolled_count: number;
}

export interface DeanAtRiskSection {
    section_id: string;
    section_code: string;
    course_code: string;
    faculty_name: string | null;
    enrolled_count: number;
    at_risk_count: number;
    avg_score_pct: number | null;
}

export interface DeanDashboard {
    success: boolean;
    message?: string;
    term: DashboardTerm | null;
    stats: DeanDashboardStats;
    unassigned_sections: DeanUnassignedSection[];
    at_risk_sections: DeanAtRiskSection[];
    program_distribution: DashboardProgramDistribution[];
}

export interface RegistrarDashboardStats {
    active_students: number;
    students_on_loa: number;
    graduated_students: number;
    enrollments_this_term: number;
    dropped_this_term: number;
    pending_grade_releases: number;
    incomplete_grades: number;
}

export interface RegistrarPendingRelease {
    section_id: string;
    section_code: string;
    course_code: string;
    course_title: string;
    faculty_name: string | null;
    pending_count: number;
    grading_period: string;
}

export interface RegistrarRecentEnrollment {
    enrollment_id: string;
    student_id: string;
    student_number: string;
    student_name: string;
    section_code: string;
    course_code: string;
    enrolled_at: string;
}

export interface RegistrarDashboard {
    success: boolean;
    message?: string;
    term: DashboardTerm | null;
    stats: RegistrarDashboardStats;
    pending_releases: RegistrarPendingRelease[];
    program_distribution: DashboardProgramDistribution[];
    recent_enrollments: RegistrarRecentEnrollment[];
}

export interface FacultyDashboardStats {
    my_sections: number;
    total_students: number;
    at_risk_students: number;
    pending_grading: number;
    published_assessments: number;
    sessions_today: number;
}

export interface FacultyDashboardSection {
    section_id: string;
    section_code: string;
    course_code: string;
    course_title: string;
    room: string | null;
    enrolled_count: number;
    at_risk_count: number;
    avg_score_pct: number | null;
}

export interface FacultyPendingGrading {
    assessment_id: string;
    section_id: string;
    title: string;
    assessment_type: string;
    section_code: string;
    course_code: string;
    due_at: string | null;
    ungraded_count: number;
}

export interface FacultyTodayClass {
    section_id: string;
    section_code: string;
    course_code: string;
    course_title: string;
    time_start: string;
    time_end: string;
    room: string | null;
}

export interface FacultyAtRiskStudent {
    student_id: string;
    enrollment_id: string;
    section_id: string;
    student_number: string;
    full_name: string;
    section_code: string;
    course_code: string;
    avg_score_pct: number | null;
    attendance_rate: number | null;
    missing_count: number;
    risk_score: number;
    risk_level: RiskLevel;
}

export interface FacultyDashboard {
    success: boolean;
    message?: string;
    term: DashboardTerm | null;
    stats: FacultyDashboardStats;
    sections: FacultyDashboardSection[];
    pending_grading: FacultyPendingGrading[];
    todays_classes: FacultyTodayClass[];
    at_risk_students: FacultyAtRiskStudent[];
}