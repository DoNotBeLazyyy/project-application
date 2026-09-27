import { SectionStatus } from '@type/section.type';

export interface MySectionListRow {
    id: string;
    section_code: string;
    course_code: string;
    course_title: string;
    term_label: string;
    status: SectionStatus;
    max_slots: number;
    enrolled_count: number;
}

export interface SectionDetail {
    id: string;
    section_code: string;
    course_code: string;
    course_title: string;
    term_label: string;
    term_id: string;
    status: SectionStatus;
    max_slots: number;
    room: string | null;
}

export interface SectionStudent {
    enrollment_id: string;
    student_id: string;
    student_number: string;
    full_name: string;
    email: string;
    year_level: number;
    status: string;
    enrolled_at: string;
    risk_level?: string | null;
    gwa?: number | null;
}

export interface StudentEvaluationProfile {
    enrollment_id: string;
    student_id: string;
    student_number: string;
    full_name: string;
    email: string;
    year_level: number;
    program_name: string | null;
    enrollment_status: string;
    enrolled_at: string;
}

export interface StudentEvaluationAttendance {
    total_sessions: number;
    present: number;
    absent: number;
    late: number;
    excused: number;
    recorded: number;
}

export interface StudentEvaluationAssessment {
    id: string;
    title: string;
    description: string | null;
    assessment_type: string;
    total_points: number;
    passing_points: number | null;
    due_at: string | null;
    question_count: number;
    grading_period_name: string | null;
    grading_period_id: string | null;
    grading_period_sequence: number | null;
    submission_id: string | null;
    submission_status: string | null;
    raw_score: number | null;
    final_score: number | null;
    is_late: boolean | null;
    submitted_at: string | null;
    graded_at: string | null;
}

export interface StudentEvaluationGrade {
    grading_period_id: string;
    grading_period_name: string;
    sequence: number;
    weight: number;
    raw_grade: number | null;
    final_grade: number | null;
    transmuted_grade: number | null;
    special_grade: string | null;
    status: GradeStatus | null;
}

export interface StudentEvaluation {
    profile: StudentEvaluationProfile;
    attendance: StudentEvaluationAttendance;
    assessments: StudentEvaluationAssessment[];
    grades: StudentEvaluationGrade[];
}

export interface StudentAttendanceRow {
    record_id: string;
    session_id: string;
    session_date: string;
    notes: string | null;
    status: AttendanceStatus;
    remarks: string | null;
}

export interface StudentGradeComponentItem {
    id: string;
    title: string;
    assessment_type: string;
    earned_points: number | null;
    max_points: number;
    submission_status: string | null;
    is_late: boolean | null;
    due_at: string | null;
    graded_at: string | null;
}

export interface StudentGradeComponent {
    id: string;
    name: string;
    weight: number;
    earned_points: number;
    max_points: number;
    weighted_score: number;
    items: StudentGradeComponentItem[];
}

export interface StudentGradeBreakdown {
    grading_period_id: string;
    grading_period_name: string;
    weight: number;
    raw_grade: number | null;
    final_grade: number | null;
    transmuted_grade: number | null;
    special_grade: string | null;
    status: GradeStatus | null;
    components: StudentGradeComponent[];
}

export interface AttendanceSession {
    id: string;
    session_date: string;
    notes: string | null;
}

export interface AttendanceSessionFormValues {
    session_date: string;
    notes: string;
}

export type AttendanceStatus = 'Present' | 'Absent' | 'Late' | 'Excused';

export interface AttendanceRecord {
    id: string;
    enrollment_id: string;
    student_number: string;
    full_name: string;
    status: AttendanceStatus;
    remarks: string | null;
}

export interface AttendanceRecordUpdate {
    id: string;
    status: AttendanceStatus;
    remarks: string;
}

export interface GradingPeriod {
    id: string;
    name: string;
    sequence: number;
    weight: number;
    start_date: string | null;
    end_date: string | null;
}

export interface GradingComponent {
    id: string;
    name: string;
    weight: number;
}

export interface GradingComponentFormValues {
    name: string;
    weight: string;
}

export type GradeStatus = 'Draft' | 'Submitted' | 'Approved' | 'Released';

export interface GradeSheetRow {
    enrollment_id: string;
    student_number: string;
    full_name: string;
    raw_grade: number | null;
    final_grade: number | null;
    transmuted_grade: number | null;
    status: GradeStatus | null;
    special_grade: string | null;
}

export interface GradeCalculationFailure {
    enrollment_id: string;
    student_number: string | null;
    full_name: string | null;
    reason: string | null;
}

export interface GradeCalculationResult {
    success: boolean;
    message: string;
    processed: number;
    succeeded: number;
    failed: number;
    failures: GradeCalculationFailure[];
}

export interface FacultyEvaluationSectionSummary {
    section_id: string;
    section_code: string;
    course_code: string;
    course_title: string;
    avg_rating: number | null;
    evaluations_count: number;
}

export interface FacultyEvaluationQuestionSummary {
    question_id: string;
    question_text: string;
    question_type: string;
    avg_rating: number | null;
    responses_count: number;
}

export interface FacultyEvaluationComment {
    response_id: string;
    section_code: string;
    course_code: string;
    response_text: string;
    created_at: string;
}

export interface FacultyEvaluationSummary {
    success: boolean;
    overall_avg_rating: number | null;
    total_evaluations_count: number;
    rating_distribution: {
        '5': number;
        '4': number;
        '3': number;
        '2': number;
        '1': number;
    };
    sections: FacultyEvaluationSectionSummary[];
    questions: FacultyEvaluationQuestionSummary[];
    comments: FacultyEvaluationComment[];
}

export interface FacultyGradeBreakdownItem {
    id: string;
    title: string;
    assessment_type: string;
    earned_points: number | null;
    max_points: number;
    submission_status: string | null;
    is_late: boolean | null;
    is_counted: boolean;
    due_at: string | null;
    graded_at: string | null;
}

export interface FacultyGradeBreakdownComponent {
    id: string;
    name: string;
    weight: number;
    earned_points: number;
    max_points: number;
    percentage: number | null;
    weighted_score: number;
    graded_count: number;
    pending_count: number;
    items: FacultyGradeBreakdownItem[];
}

export interface FacultyStudentGradeBreakdown {
    enrollment_id: string;
    student_id: string;
    student_name: string;
    student_number: string;
    section_id: string;
    section_code: string;
    course_code: string;
    course_title: string;
    term_label: string;
    grading_period_id: string;
    grading_period_name: string;
    sequence: number;
    weight: number;
    raw_grade: number;
    final_grade: number;
    transmuted_grade: string;
    special_grade: string | null;
    status: GradeStatus;
    components: FacultyGradeBreakdownComponent[];
    total_component_weight: number;
    passing_grade: number;
}