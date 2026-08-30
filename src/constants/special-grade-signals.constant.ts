import { SignalDescriptor, SpecialGradeOperator } from '@type/grading-config.type';

/**
 * Signal registry — the vocabulary a special grade rule can be built from.
 *
 * This is the TypeScript mirror of the keys returned by the SQL function
 * `fn_special_grade_signals` (see docs/sql/special-grade-rule-engine.sql).
 * The two must stay in step: a signal listed here but missing from the SQL
 * evaluates as unknown and fails closed, so a rule using it never fires.
 *
 * Adding a new measurable fact is the one change that still needs a developer,
 * and it is deliberately small: one key in the SQL function, one entry here.
 * Everything downstream — the builder dropdown, the preview, the evidence
 * tooltip — is driven off this list.
 */

const COMPARISON_OPERATORS: SpecialGradeOperator[] = ['>=', '>', '<=', '<', '=', '!=', 'between'];

export const SPECIAL_GRADE_OPERATOR_LABELS: Record<SpecialGradeOperator, string> = {
    '!=': 'is not',
    '<': 'is below',
    '<=': 'is at most',
    '=': 'is exactly',
    '>': 'is above',
    '>=': 'is at least',
    'between': 'is between',
    'is_null': 'was never recorded',
    'not_null': 'has been recorded'
};

export const SPECIAL_GRADE_SIGNALS: SignalDescriptor[] = [
    {
        description: 'Share of recorded sessions the student was marked Absent. Accumulates across the whole term.',
        group: 'Attendance',
        id: 'absence_rate',
        operators: COMPARISON_OPERATORS,
        unit: '%'
    },
    {
        description: 'Share of recorded sessions the student was present for.',
        group: 'Attendance',
        id: 'attendance_rate',
        operators: COMPARISON_OPERATORS,
        unit: '%'
    },
    {
        description: 'Share of recorded sessions the student was marked Excused.',
        group: 'Attendance',
        id: 'excused_rate',
        operators: COMPARISON_OPERATORS,
        unit: '%'
    },
    {
        description: 'Number of sessions the student was marked Absent.',
        group: 'Attendance',
        id: 'absent_count',
        operators: COMPARISON_OPERATORS,
        unit: 'sessions'
    },
    {
        description: 'Number of sessions the student was marked Late.',
        group: 'Attendance',
        id: 'late_count',
        operators: COMPARISON_OPERATORS,
        unit: 'sessions'
    },
    {
        description: 'Number of sessions the student was marked Excused.',
        group: 'Attendance',
        id: 'excused_count',
        operators: COMPARISON_OPERATORS,
        unit: 'sessions'
    },
    {
        description: 'Total sessions with attendance recorded for this student.',
        group: 'Attendance',
        id: 'sessions_total',
        operators: COMPARISON_OPERATORS,
        unit: 'sessions'
    },
    {
        description: 'Published, past-due assessments of any type with no submission.',
        group: 'Missing work',
        id: 'missing_assessment_count',
        operators: COMPARISON_OPERATORS,
        unit: 'items'
    },
    {
        description: 'Past-due Exams with no submission. The classic Incomplete trigger.',
        group: 'Missing work',
        id: 'missing_exam_count',
        operators: COMPARISON_OPERATORS,
        unit: 'items'
    },
    {
        description: 'Past-due Quizzes with no submission.',
        group: 'Missing work',
        id: 'missing_quiz_count',
        operators: COMPARISON_OPERATORS,
        unit: 'items'
    },
    {
        description: 'Past-due Activities with no submission.',
        group: 'Missing work',
        id: 'missing_activity_count',
        operators: COMPARISON_OPERATORS,
        unit: 'items'
    },
    {
        description: 'Past-due Assignments with no submission.',
        group: 'Missing work',
        id: 'missing_assignment_count',
        operators: COMPARISON_OPERATORS,
        unit: 'items'
    },
    {
        description: 'Past-due Projects with no submission.',
        group: 'Missing work',
        id: 'missing_project_count',
        operators: COMPARISON_OPERATORS,
        unit: 'items'
    },
    {
        description: 'Past-due Lab Reports with no submission.',
        group: 'Missing work',
        id: 'missing_lab_report_count',
        operators: COMPARISON_OPERATORS,
        unit: 'items'
    }
];

export const SPECIAL_GRADE_SIGNAL_LABELS: Record<string, string> = {
    absence_rate: 'Absence rate',
    absent_count: 'Absences',
    attendance_rate: 'Attendance rate',
    excused_count: 'Excused sessions',
    excused_rate: 'Excused rate',
    late_count: 'Late arrivals',
    missing_activity_count: 'Missing Activities',
    missing_assessment_count: 'Missing assessments (any type)',
    missing_assignment_count: 'Missing Assignments',
    missing_exam_count: 'Missing Exams',
    missing_lab_report_count: 'Missing Lab Reports',
    missing_project_count: 'Missing Projects',
    missing_quiz_count: 'Missing Quizzes',
    sessions_total: 'Recorded sessions'
};

export function getSignalDescriptor(signalId: string): SignalDescriptor | undefined {
    return SPECIAL_GRADE_SIGNALS.find((signal) => signal.id === signalId);
}

export function getSignalLabel(signalId: string): string {
    return SPECIAL_GRADE_SIGNAL_LABELS[signalId] ?? signalId;
}