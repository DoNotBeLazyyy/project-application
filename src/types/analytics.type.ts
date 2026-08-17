export type InsightGranularity = 'fine' | 'medium';

export type RiskLevel = 'Low' | 'Moderate' | 'High';

export interface InsightStudentHeader {
    student_id: string;
    student_number: string;
    full_name: string;
    year_level: number;
    status: string;
    program_code: string | null;
    program_name: string | null;
}

export interface InsightTerm {
    term_id: string;
    term_label: string;
    status: string;
}

export interface InsightAcademic {
    cumulative_gwa: number | null;
    term_gwa: number | null;
    earned_units: number;
    required_units: number;
    remaining_units: number;
    failing_count: number;
}

export interface InsightTrendPoint {
    term_id: string;
    term_label: string;
    gwa: number | null;
    units: number | null;
}

export interface InsightTrajectory {
    code: string;
    label: string;
    category: string;
    target_gwa: number;
    discount_pct: number | null;
    is_currently_qualified: boolean;
    is_blocked_by_failing: boolean;
    gwa_gap: number | null;
    required_avg_on_remaining: number | null;
    is_attainable: boolean | null;
}

export interface InsightCourse {
    enrollment_id: string;
    section_id: string;
    section_code: string;
    course_code: string;
    course_title: string;
    avg_score_pct: number | null;
    attendance_rate: number | null;
    missing_count: number;
    graded_count: number;
    released_grade: number | null;
}

export interface MasteryEntry {
    key: string;
    label: string;
    code: string | null;
    title: string | null;
    bloom_level: string | null;
    score_pct: number | null;
    item_count: number;
    student_count: number | null;
}

export interface InsightPerformance {
    granularity: InsightGranularity;
    avg_score_pct: number | null;
    by_assessment_type: MasteryEntry[];
    by_competency: MasteryEntry[];
    strengths: MasteryEntry[];
    weaknesses: MasteryEntry[];
}

export interface InsightEngagement {
    sessions_total: number;
    present_count: number;
    late_count: number;
    excused_count: number;
    absent_count: number;
    attendance_rate: number | null;
    due_count: number;
    submitted_count: number;
    on_time_count: number;
    late_submission_count: number;
    missing_count: number;
    submission_rate: number | null;
    on_time_rate: number | null;
    materials_total: number;
    materials_completed: number;
    materials_rate: number | null;
}

export interface InsightRisk {
    risk_score: number;
    risk_level: RiskLevel;
    is_at_risk: boolean;
    reasons: string[];
}

export interface InsightFocus {
    priority: number;
    title: string;
    detail: string;
}

export interface StudentInsight {
    success: boolean;
    message?: string;
    student: InsightStudentHeader;
    term: InsightTerm | null;
    academic: InsightAcademic;
    gwa_trend: InsightTrendPoint[];
    trajectory: InsightTrajectory[];
    courses: InsightCourse[];
    performance: InsightPerformance;
    engagement: InsightEngagement;
    risk: InsightRisk;
    recommended_focus: InsightFocus[];
}

export interface SectionInsightHeader {
    section_id: string;
    section_code: string;
    course_code: string;
    course_title: string;
    term_label: string;
}

export interface SectionInsightSummary {
    enrolled_count: number;
    at_risk_count: number;
    avg_score_pct: number | null;
    avg_attendance_rate: number | null;
    submission_rate: number | null;
}

export interface SectionInsightStudent {
    student_id: string;
    enrollment_id: string;
    student_number: string;
    full_name: string;
    avg_score_pct: number | null;
    attendance_rate: number | null;
    missing_count: number;
    graded_count: number;
    risk_score: number;
    risk_level: RiskLevel;
    is_at_risk: boolean;
}

export interface SectionInsightAssessment {
    assessment_id: string;
    title: string;
    assessment_type: string;
    due_at: string | null;
    total_points: number;
    avg_score_pct: number | null;
    highest_pct: number | null;
    lowest_pct: number | null;
    graded_count: number;
    submission_rate: number | null;
}

export interface ScoreDistributionBucket {
    bucket: string;
    student_count: number;
}

export interface SectionMastery {
    granularity: InsightGranularity;
    by_assessment_type: MasteryEntry[];
    by_competency: MasteryEntry[];
    gaps: MasteryEntry[];
}

export interface SectionInsight {
    success: boolean;
    message?: string;
    section: SectionInsightHeader;
    summary: SectionInsightSummary;
    students: SectionInsightStudent[];
    assessments: SectionInsightAssessment[];
    score_distribution: ScoreDistributionBucket[];
    mastery: SectionMastery;
}

export interface ItemAnalysisAssessment {
    assessment_id: string;
    title: string;
    assessment_type: string;
    total_points: number;
    section_id: string;
    section_code: string;
    course_code: string;
}

export interface ItemAnalysisSummary {
    submission_count: number;
    mean_pct: number | null;
    median_pct: number | null;
    highest_pct: number | null;
    lowest_pct: number | null;
    std_dev_pct: number | null;
    group_size: number;
}

export interface ItemAnalysisChoice {
    choice_id: string;
    choice_text: string;
    is_correct: boolean;
    selected_count: number;
}

export interface ItemAnalysisCompetency {
    code: string;
    title: string;
}

export interface ItemAnalysisQuestion {
    question_id: string;
    sequence: number;
    question_text: string;
    question_type: string;
    points: number;
    answered_count: number;
    correct_count: number;
    difficulty_index: number | null;
    difficulty_label: string | null;
    discrimination_index: number | null;
    discrimination_label: string | null;
    competencies: ItemAnalysisCompetency[];
    choices: ItemAnalysisChoice[];
}

export interface AssessmentItemAnalysis {
    success: boolean;
    message?: string;
    assessment: ItemAnalysisAssessment;
    summary: ItemAnalysisSummary;
    questions: ItemAnalysisQuestion[];
}

export interface IntegrityAssessment {
    assessment_id: string;
    title: string;
    section_id: string;
    section_code: string;
    course_code: string;
}

export interface IntegritySummary {
    submission_count: number;
    focus_flagged_count: number;
    shared_ip_count: number;
    roaming_ip_count: number;
}

export interface IntegritySharedIp {
    ip_address: string;
    student_number: string;
    full_name: string;
}

export interface IntegritySubmission {
    submission_id: string;
    student_number: string;
    full_name: string;
    attempt_number: number;
    status: string;
    started_at: string | null;
    submitted_at: string | null;
    focus_lost_count: number;
    total_away_seconds: number;
    longest_away_seconds: number;
    distinct_ip_count: number;
    ip_addresses: string[];
    shared_with: IntegritySharedIp[];
}

export interface AssessmentIntegrityReport {
    success: boolean;
    message?: string;
    assessment: IntegrityAssessment;
    summary: IntegritySummary;
    submissions: IntegritySubmission[];
}