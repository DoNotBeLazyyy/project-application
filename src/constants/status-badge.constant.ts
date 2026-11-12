import { AssessmentType, SubmissionStatus } from '@type/assessment.type';
import { BadgeStatusVariant } from '@type/common/badge.type';
import { SectionStatus } from '@type/section.type';

// Badge colors for each status, shared so every screen shows a status the same way

export const SECTION_STATUS_VARIANT: Record<SectionStatus, BadgeStatusVariant> = {
    Cancelled: 'error',
    Closed: 'neutral',
    Full: 'warning',
    Ongoing: 'info',
    Open: 'success'
};

export const SUBMISSION_STATUS_VARIANT: Record<SubmissionStatus, BadgeStatusVariant> = {
    'Graded': 'success',
    'In Progress': 'warning',
    'Late': 'warning',
    'Not Started': 'neutral',
    'Returned': 'success',
    'Submitted': 'info'
};

export const ASSESSMENT_TYPE_VARIANT: Record<AssessmentType, BadgeStatusVariant> = {
    'Activity': 'success',
    'Assignment': 'warning',
    'Exam': 'error',
    'Lab Report': 'warning',
    'Project': 'info',
    'Quiz': 'info'
};

/**
 * Badge color for a grade status (Draft, Submitted, Approved, Released).
 *
 * @param status - The grade status, or null when there is no grade yet.
 * @returns The badge variant.
 */
export function gradeStatusVariant(status: string | null): BadgeStatusVariant {
    switch (status) {
    case 'Released':
        return 'success';
    case 'Approved':
        return 'info';
    case 'Submitted':
        return 'warning';
    default:
        return 'neutral';
    }
}

/**
 * Badge color for a submission status, with unknown values shown as an error.
 *
 * @param status - The submission status, or null.
 * @returns The badge variant.
 */
export function submissionStatusVariant(status: string | null): BadgeStatusVariant {
    if (status && status in SUBMISSION_STATUS_VARIANT) {
        return SUBMISSION_STATUS_VARIANT[status as SubmissionStatus];
    }

    return 'error';
}

/**
 * Badge color for an attendance status.
 *
 * @param status - Present, Late, Excused or Absent.
 * @returns The badge variant.
 */
export function attendanceStatusVariant(status: string | null): BadgeStatusVariant {
    switch (status) {
    case 'Present':
        return 'success';
    case 'Late':
        return 'warning';
    case 'Excused':
        return 'info';
    default:
        return 'error';
    }
}