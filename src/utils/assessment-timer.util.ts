export type AssessmentStatus = 'Draft' | 'Published' | 'Archived';
export type SubmissionStatus = 'In Progress' | 'Submitted' | 'Graded';
export type TimerSessionStatus = 'Active' | 'Expired' | 'Terminated';
export type FocusEventType = 'Heartbeat' | 'Focus Lost' | 'Focus Restored';

export interface AssessmentItemConfig {
    id: string;
    sectionId: string;
    isPublished: boolean;
    scheduledPublishAt?: string | null;
    opensAt?: string | null;
    closesAt?: string | null;
    timeLimitMinutes?: number | null;
    maxAttempts: number;
}

export interface SubmissionRecord {
    id: string;
    assessmentItemId: string;
    enrollmentId: string;
    attemptNumber: number;
    status: SubmissionStatus;
    startedAt: string;
    timeLimitExpiresAt: string | null;
    submittedAt?: string | null;
}

export interface TimerSessionRecord {
    id: string;
    submissionId: string;
    enrollmentId: string;
    assessmentItemId: string;
    serverStartedAt: string;
    serverExpiresAt: string | null;
    status: TimerSessionStatus;
    lastActivityAt: string;
    focusEventCount: number;
}

export interface StartTimerResult {
    success: boolean;
    message?: string;
    submissionId?: string;
    expiresAt?: string | null;
    isResumed?: boolean;
}

/**
 * Validates assessment accessibility and starts or resumes an assessment timer session.
 */
export function processStartAssessmentTimer(
    currentTime: Date,
    config: AssessmentItemConfig,
    isEnrolled: boolean,
    existingSubmissions: SubmissionRecord[],
    generateId: () => string
): {
    result: StartTimerResult;
    updatedSubmission?: SubmissionRecord;
    newSubmission?: SubmissionRecord;
    newSession?: TimerSessionRecord;
} {
    // 1. Publication check
    const isScheduledPublished = config.scheduledPublishAt
        ? new Date(config.scheduledPublishAt) <= currentTime
        : false;
    if (!config.isPublished && !isScheduledPublished) {
        return { result: { success: false, message: 'Assessment not found or not published.' } };
    }

    // 2. Schedule window checks
    if (config.opensAt && currentTime < new Date(config.opensAt)) {
        return { result: { success: false, message: 'Assessment is not yet open.' } };
    }
    if (config.closesAt && currentTime > new Date(config.closesAt)) {
        return { result: { success: false, message: 'Assessment window has closed.' } };
    }

    // 3. Enrollment check
    if (!isEnrolled) {
        return { result: { success: false, message: 'Student is not enrolled in this section.' } };
    }

    // 4. Check for active In Progress submission (Resume logic)
    const inProgressSub = existingSubmissions.find(
        (s) => s.assessmentItemId === config.id && s.status === 'In Progress'
    );

    if (inProgressSub) {
        if (inProgressSub.timeLimitExpiresAt && currentTime > new Date(inProgressSub.timeLimitExpiresAt)) {
            const expiredSub: SubmissionRecord = {
                ...inProgressSub,
                status: 'Submitted',
                submittedAt: inProgressSub.timeLimitExpiresAt
            };
            return {
                result: { success: false, message: 'Time limit has expired.' },
                updatedSubmission: expiredSub
            };
        }

        return {
            result: {
                success: true,
                submissionId: inProgressSub.id,
                expiresAt: inProgressSub.timeLimitExpiresAt,
                isResumed: true
            }
        };
    }

    // 5. Attempt count check
    const completedAttempts = existingSubmissions.filter(
        (s) => s.assessmentItemId === config.id && s.status !== 'In Progress'
    ).length;

    if (completedAttempts >= config.maxAttempts) {
        return { result: { success: false, message: 'Maximum attempts reached.' } };
    }

    // 6. Create new submission & timer session
    const timeLimitMinutes = config.timeLimitMinutes ?? null;
    const expiresAt = timeLimitMinutes !== null && timeLimitMinutes > 0
        ? new Date(currentTime.getTime() + timeLimitMinutes * 60 * 1000)
            .toISOString()
        : null;

    const submissionId = generateId();
    const newSubmission: SubmissionRecord = {
        id: submissionId,
        assessmentItemId: config.id,
        enrollmentId: 'enrollment-current',
        attemptNumber: completedAttempts + 1,
        status: 'In Progress',
        startedAt: currentTime.toISOString(),
        timeLimitExpiresAt: expiresAt
    };

    const newSession: TimerSessionRecord = {
        id: generateId(),
        submissionId,
        enrollmentId: 'enrollment-current',
        assessmentItemId: config.id,
        serverStartedAt: currentTime.toISOString(),
        serverExpiresAt: expiresAt,
        status: 'Active',
        lastActivityAt: currentTime.toISOString(),
        focusEventCount: 0
    };

    return {
        result: {
            success: true,
            submissionId,
            expiresAt,
            isResumed: false
        },
        newSubmission,
        newSession
    };
}

/**
 * Executes expired assessment sweep, transitioning any overdue In Progress submissions to Submitted.
 */
export function sweepExpiredAssessmentSessions(
    currentTime: Date,
    submissions: SubmissionRecord[],
    sessions: TimerSessionRecord[]
): {
    sweptSubmissions: SubmissionRecord[];
    sweptSessions: TimerSessionRecord[];
} {
    const sweptSubmissions = submissions.map((sub) => {
        if (
            sub.status === 'In Progress'
            && sub.timeLimitExpiresAt
            && new Date(sub.timeLimitExpiresAt) < currentTime
        ) {
            return {
                ...sub,
                status: 'Submitted' as SubmissionStatus,
                submittedAt: sub.timeLimitExpiresAt
            };
        }
        return sub;
    });

    const sweptSessions = sessions.map((sess) => {
        if (
            sess.status === 'Active'
            && sess.serverExpiresAt
            && new Date(sess.serverExpiresAt) < currentTime
        ) {
            return {
                ...sess,
                status: 'Expired' as TimerSessionStatus
            };
        }
        return sess;
    });

    return { sweptSubmissions, sweptSessions };
}

/**
 * Formats time difference in milliseconds into mm:ss display string.
 */
export function formatRemainingTime(remainingMs: number): { formatted: string; isWarning: boolean; isExpired: boolean } {
    if (remainingMs <= 0) {
        return { formatted: '00:00', isWarning: true, isExpired: true };
    }

    const totalSeconds = Math.floor(remainingMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    const formatted = `${String(minutes)
        .padStart(2, '0')}:${String(seconds)
        .padStart(2, '0')}`;
    const isWarning = remainingMs < 5 * 60 * 1000; // Under 5 minutes

    return { formatted, isWarning, isExpired: false };
}