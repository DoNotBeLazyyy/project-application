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
 *
 * Attendance is expressed as exact counts, never as a rate. A percentage
 * threshold means a different number of absences in a section that met twelve
 * times than in one that met forty, so the same written policy would catch
 * different students depending on the timetable. Counts say what the handbook
 * says: six absences is six absences.
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
        description: 'Number of sessions the student was marked Absent. Accumulates across the whole term.',
        group: 'Attendance',
        id: 'absent_count',
        operators: COMPARISON_OPERATORS,
        unit: 'sessions'
    },
    {
        description: 'Number of sessions the student was marked Late. Accumulates across the whole term.',
        group: 'Attendance',
        id: 'late_count',
        operators: COMPARISON_OPERATORS,
        unit: 'sessions'
    },
    {
        description: 'Number of sessions the student was marked Excused. Accumulates across the whole term.',
        group: 'Attendance',
        id: 'excused_count',
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
        description: 'Past-due Quizzes with no submission.',
        group: 'Missing work',
        id: 'missing_quiz_count',
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
    },
    /**
     * Retired signals.
     *
     * The SQL registry still computes these, so a rule authored before the move
     * to exact counts keeps firing exactly as it did. They are kept here — and
     * only here — so the builder can still name and explain such a rule instead
     * of rendering it as an unknown signal. They are filtered out of the picker,
     * so no new rule can be built on one.
     */
    {
        description: 'Retired. Share of recorded sessions the student was marked Absent. Rewrite this condition as a count of absences.',
        group: 'Attendance',
        id: 'absence_rate',
        isDeprecated: true,
        operators: COMPARISON_OPERATORS,
        unit: '%'
    },
    {
        description: 'Retired. Share of recorded sessions the student was present for. Rewrite this condition as a count of absences.',
        group: 'Attendance',
        id: 'attendance_rate',
        isDeprecated: true,
        operators: COMPARISON_OPERATORS,
        unit: '%'
    },
    {
        description: 'Retired. Share of recorded sessions the student was marked Excused. Rewrite this condition as a count of excused sessions.',
        group: 'Attendance',
        id: 'excused_rate',
        isDeprecated: true,
        operators: COMPARISON_OPERATORS,
        unit: '%'
    },
    {
        description: 'Retired. Total sessions with attendance recorded for this student.',
        group: 'Attendance',
        id: 'sessions_total',
        isDeprecated: true,
        operators: COMPARISON_OPERATORS,
        unit: 'sessions'
    }
];

/** The signals a new condition may be built from — retired ones excluded. */
export const SPECIAL_GRADE_AUTHORABLE_SIGNALS: SignalDescriptor[] = SPECIAL_GRADE_SIGNALS
    .filter((signal) => !signal.isDeprecated);

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