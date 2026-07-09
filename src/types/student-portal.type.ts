import { AssessmentAttachment, AssessmentType, QuestionType } from '@type/assessment.type';
import { EnrollmentStatus } from '@type/enrollment.type';
import { GradeStatus } from '@type/faculty.type';

export interface StudentDashboard {
    enrolled_count: number;
    upcoming_assessments: UpcomingAssessment[];
    pending_grades_count: number;
}

export interface UpcomingAssessment {
    id: string;
    title: string;
    assessment_type: AssessmentType;
    due_at: string | null;
    opens_at: string | null;
    section_code: string;
    course_code: string;
    enrollment_id: string;
}

export interface StudentScheduleSection {
    section_id: string;
    section_code: string;
    course_code: string;
    course_title: string;
    faculty_name: string;
    enrollment_id: string;
    is_conflict_authorized: boolean;
    conflict_reason: string | null;
    schedules: SectionScheduleSlot[];
}

export interface SectionScheduleSlot {
    id: string;
    day_of_week: DayOfWeek;
    time_start: string;
    time_end: string;
    room: string | null;
}

export type DayOfWeek =
    | 'Monday'
    | 'Tuesday'
    | 'Wednesday'
    | 'Thursday'
    | 'Friday'
    | 'Saturday'
    | 'Sunday';

export interface MySubjectListRow {
    enrollment_id: string;
    section_id: string;
    section_code: string;
    course_code: string;
    course_title: string;
    lecture_units: number;
    laboratory_units: number;
    term_label: string;
    faculty_name: string | null;
    enrollment_status: EnrollmentStatus;
    final_grade: number | null;
    is_grade_visible: boolean;
    total_count: number;
}

export interface SubjectAssessmentItem {
    id: string;
    title: string;
    description: string | null;
    assessment_type: AssessmentType;
    grading_period_id: string | null;
    grading_period_name: string | null;
    grading_period_sequence: number | null;
    total_points: number;
    passing_points: number | null;
    time_limit_minutes: number | null;
    max_attempts: number;
    question_count: number;
    show_all_questions: boolean;
    questions_per_page: number | null;
    opens_at: string | null;
    due_at: string | null;
    closes_at: string | null;
    scheduled_publish_at: string | null;
    submission_status: string | null;
    submission_id: string | null;
    attempts_used: number;
    attachments: AssessmentAttachment[];
}

export interface SubjectGradeItem {
    grading_period_id: string;
    grading_period_name: string;
    sequence: number;
    raw_grade: number | null;
    final_grade: number | null;
    transmuted_grade: number | null;
    special_grade: string | null;
    status: GradeStatus | null;
    is_visible: boolean;
    evaluation_completed: boolean;
}

export interface SubjectDetail {
    enrollment_id: string;
    section_id: string;
    section_code: string;
    course_code: string;
    course_title: string;
    term_label: string;
    faculty_name: string | null;
    enrollment_status: EnrollmentStatus;
}

export interface StudentAssessment {
    id: string;
    title: string;
    description: string | null;
    assessment_type: AssessmentType;
    total_points: number;
    passing_points: number | null;
    time_limit_minutes: number | null;
    max_attempts: number;
    show_all_questions: boolean;
    questions_per_page: number | null;
    shuffle_questions: boolean;
    shuffle_choices: boolean;
    opens_at: string | null;
    due_at: string | null;
    closes_at: string | null;
    show_results_at: string | null;
    scheduled_publish_at: string | null;
    attachments: AssessmentAttachment[];
}

export interface StudentQuestionChoice {
    id: string;
    choice_text: string;
    sequence: number;
}

export interface SavedAnswer {
    id: string;
    answer_text: string | null;
    choice_id: string | null;
}

export interface StudentQuestion {
    id: string;
    question_text: string;
    question_type: QuestionType;
    points: number;
    sequence: number;
    is_required: boolean;
    allowed_file_types: string[] | null;
    max_file_size_mb: number | null;
    max_file_count: number | null;
    saved_answer: SavedAnswer | null;
    choices: StudentQuestionChoice[];
}

export interface DraftAnswer {
    question_id: string;
    answer_text: string;
    choice_id: string;
}

export interface MyGradeListRow {
    enrollment_id: string;
    section_code: string;
    course_code: string;
    course_title: string;
    term_label: string;
    grading_period_name: string;
    grading_period_sequence: number;
    raw_grade: number | null;
    final_grade: number | null;
    transmuted_grade: number | null;
    special_grade: string | null;
    total_count: number;
}

export interface MyGradesFilterValues {
    term_id: string;
}