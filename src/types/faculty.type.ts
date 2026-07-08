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

export interface StudentGradeComponent {
    id: string;
    name: string;
    weight: number;
    earned_points: number;
    max_points: number;
    weighted_score: number;
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