import AssessmentTimer from '@pages/student/assessment/AssessmentTimer';
import { act, render, screen } from '@testing-library/react';
import {
    AssessmentItemConfig,
    formatRemainingTime,
    processStartAssessmentTimer,
    SubmissionRecord,
    sweepExpiredAssessmentSessions,
    TimerSessionRecord
} from '@utils/assessment-timer.util';
import React from 'react';
import {
    beforeEach, describe, expect, it, vi
} from 'vitest';

describe('Assessment Session Timer and Auto-Submission Rules', () => {
    let mockIdCounter = 1;
    function generateMockId(): string {
        const id = `mock-uuid-${mockIdCounter}`;
        mockIdCounter += 1;
        return id;
    }

    const baseConfig: AssessmentItemConfig = {
        id: 'assessment-item-1',
        sectionId: 'section-1',
        isPublished: true,
        timeLimitMinutes: 30,
        maxAttempts: 2
    };

    beforeEach(() => {
        mockIdCounter = 1;
    });

    describe('1. Assessment Availability & Schedule Window Gates', () => {
        const now = new Date('2026-08-28T10:00:00Z');

        it('should block starting an unpublished assessment', () => {
            const unpublished = { ...baseConfig, isPublished: false };
            const { result } = processStartAssessmentTimer(now, unpublished, true, [], generateMockId);
            expect(result.success)
                .toBe(false);
            expect(result.message)
                .toContain('Assessment not found or not published');
        });

        it('should allow starting an assessment with past scheduled_publish_at', () => {
            const scheduled = {
                ...baseConfig,
                isPublished: false,
                scheduledPublishAt: '2026-08-28T09:00:00Z'
            };
            const { result } = processStartAssessmentTimer(now, scheduled, true, [], generateMockId);
            expect(result.success)
                .toBe(true);
        });

        it('should block starting an assessment before opens_at', () => {
            const futureOpen = {
                ...baseConfig,
                opensAt: '2026-08-28T11:00:00Z'
            };
            const { result } = processStartAssessmentTimer(now, futureOpen, true, [], generateMockId);
            expect(result.success)
                .toBe(false);
            expect(result.message)
                .toContain('Assessment is not yet open');
        });

        it('should block starting an assessment after closes_at', () => {
            const pastClose = {
                ...baseConfig,
                closesAt: '2026-08-28T09:30:00Z'
            };
            const { result } = processStartAssessmentTimer(now, pastClose, true, [], generateMockId);
            expect(result.success)
                .toBe(false);
            expect(result.message)
                .toContain('Assessment window has closed');
        });

        it('should block student who is not enrolled in the section', () => {
            const { result } = processStartAssessmentTimer(now, baseConfig, false, [], generateMockId);
            expect(result.success)
                .toBe(false);
            expect(result.message)
                .toContain('Student is not enrolled in this section');
        });
    });

    describe('2. Attempt Counting & Limits', () => {
        const now = new Date('2026-08-28T10:00:00Z');

        it('should create attempt #1 for fresh assessment', () => {
            const { result, newSubmission } = processStartAssessmentTimer(now, baseConfig, true, [], generateMockId);
            expect(result.success)
                .toBe(true);
            expect(newSubmission?.attemptNumber)
                .toBe(1);
            expect(newSubmission?.status)
                .toBe('In Progress');
        });

        it('should create attempt #2 if attempt #1 is submitted and maxAttempts is 2', () => {
            const previousSubmissions: SubmissionRecord[] = [
                {
                    id: 'sub-1',
                    assessmentItemId: baseConfig.id,
                    enrollmentId: 'enroll-1',
                    attemptNumber: 1,
                    status: 'Submitted',
                    startedAt: '2026-08-28T08:00:00Z',
                    timeLimitExpiresAt: '2026-08-28T08:30:00Z',
                    submittedAt: '2026-08-28T08:25:00Z'
                }
            ];

            const { result, newSubmission } = processStartAssessmentTimer(
                now,
                baseConfig,
                true,
                previousSubmissions,
                generateMockId
            );

            expect(result.success)
                .toBe(true);
            expect(newSubmission?.attemptNumber)
                .toBe(2);
        });

        it('should block starting when completed attempts reach maxAttempts', () => {
            const previousSubmissions: SubmissionRecord[] = [
                {
                    id: 'sub-1',
                    assessmentItemId: baseConfig.id,
                    enrollmentId: 'enroll-1',
                    attemptNumber: 1,
                    status: 'Submitted',
                    startedAt: '2026-08-28T08:00:00Z',
                    timeLimitExpiresAt: '2026-08-28T08:30:00Z'
                },
                {
                    id: 'sub-2',
                    assessmentItemId: baseConfig.id,
                    enrollmentId: 'enroll-1',
                    attemptNumber: 2,
                    status: 'Submitted',
                    startedAt: '2026-08-28T09:00:00Z',
                    timeLimitExpiresAt: '2026-08-28T09:30:00Z'
                }
            ];

            const { result } = processStartAssessmentTimer(now, baseConfig, true, previousSubmissions, generateMockId);
            expect(result.success)
                .toBe(false);
            expect(result.message)
                .toContain('Maximum attempts reached');
        });
    });

    describe('3. Timer Expiration Calculation & Active Session Resume', () => {
        const now = new Date('2026-08-28T10:00:00Z');

        it('should calculate accurate time_limit_expires_at based on time_limit_minutes', () => {
            const { result } = processStartAssessmentTimer(now, baseConfig, true, [], generateMockId);
            // Started at 10:00:00Z + 30 mins = 10:30:00Z
            expect(result.expiresAt)
                .toBe('2026-08-28T10:30:00.000Z');
        });

        it('should return null expires_at for untimed assessments', () => {
            const untimed = { ...baseConfig, timeLimitMinutes: null };
            const { result } = processStartAssessmentTimer(now, untimed, true, [], generateMockId);
            expect(result.expiresAt)
                .toBeNull();
        });

        it('should resume active In Progress session on page refresh without resetting timer', () => {
            const existingSub: SubmissionRecord = {
                id: 'active-sub-1',
                assessmentItemId: baseConfig.id,
                enrollmentId: 'enroll-1',
                attemptNumber: 1,
                status: 'In Progress',
                startedAt: '2026-08-28T10:00:00Z',
                timeLimitExpiresAt: '2026-08-28T10:30:00.000Z'
            };

            // Student refreshes 10 minutes into the assessment (10:10:00Z)
            const refreshTime = new Date('2026-08-28T10:10:00Z');
            const { result } = processStartAssessmentTimer(
                refreshTime,
                baseConfig,
                true,
                [existingSub],
                generateMockId
            );

            expect(result.success)
                .toBe(true);
            expect(result.isResumed)
                .toBe(true);
            expect(result.submissionId)
                .toBe('active-sub-1');
            expect(result.expiresAt)
                .toBe('2026-08-28T10:30:00.000Z'); // Preserved original expiration!
        });

        it('should auto-submit session if time limit expired while away upon reconnect', () => {
            const existingSub: SubmissionRecord = {
                id: 'active-sub-1',
                assessmentItemId: baseConfig.id,
                enrollmentId: 'enroll-1',
                attemptNumber: 1,
                status: 'In Progress',
                startedAt: '2026-08-28T10:00:00Z',
                timeLimitExpiresAt: '2026-08-28T10:30:00.000Z'
            };

            // Student reconnects at 10:35:00Z (after 10:30:00Z expiration)
            const lateTime = new Date('2026-08-28T10:35:00Z');
            const { result, updatedSubmission } = processStartAssessmentTimer(
                lateTime,
                baseConfig,
                true,
                [existingSub],
                generateMockId
            );

            expect(result.success)
                .toBe(false);
            expect(result.message)
                .toContain('Time limit has expired');
            expect(updatedSubmission?.status)
                .toBe('Submitted');
            expect(updatedSubmission?.submittedAt)
                .toBe('2026-08-28T10:30:00.000Z');
        });
    });

    describe('4. Background Auto-Submission Sweep Logic', () => {
        it('should transition all overdue In Progress submissions to Submitted', () => {
            const currentTime = new Date('2026-08-28T11:00:00Z');
            const submissions: SubmissionRecord[] = [
                {
                    id: 'sub-active',
                    assessmentItemId: 'ai-1',
                    enrollmentId: 'en-1',
                    attemptNumber: 1,
                    status: 'In Progress',
                    startedAt: '2026-08-28T10:45:00Z',
                    timeLimitExpiresAt: '2026-08-28T11:15:00Z' // Still valid
                },
                {
                    id: 'sub-overdue',
                    assessmentItemId: 'ai-2',
                    enrollmentId: 'en-2',
                    attemptNumber: 1,
                    status: 'In Progress',
                    startedAt: '2026-08-28T10:00:00Z',
                    timeLimitExpiresAt: '2026-08-28T10:30:00Z' // Overdue
                }
            ];

            const sessions: TimerSessionRecord[] = [
                {
                    id: 'sess-active',
                    submissionId: 'sub-active',
                    enrollmentId: 'en-1',
                    assessmentItemId: 'ai-1',
                    serverStartedAt: '2026-08-28T10:45:00Z',
                    serverExpiresAt: '2026-08-28T11:15:00Z',
                    status: 'Active',
                    lastActivityAt: '2026-08-28T10:45:00Z',
                    focusEventCount: 0
                },
                {
                    id: 'sess-overdue',
                    submissionId: 'sub-overdue',
                    enrollmentId: 'en-2',
                    assessmentItemId: 'ai-2',
                    serverStartedAt: '2026-08-28T10:00:00Z',
                    serverExpiresAt: '2026-08-28T10:30:00Z',
                    status: 'Active',
                    lastActivityAt: '2026-08-28T10:00:00Z',
                    focusEventCount: 0
                }
            ];

            const { sweptSubmissions, sweptSessions } = sweepExpiredAssessmentSessions(
                currentTime,
                submissions,
                sessions
            );

            expect(sweptSubmissions.find((s) => s.id === 'sub-active')?.status)
                .toBe('In Progress');
            expect(sweptSubmissions.find((s) => s.id === 'sub-overdue')?.status)
                .toBe('Submitted');

            expect(sweptSessions.find((s) => s.id === 'sess-active')?.status)
                .toBe('Active');
            expect(sweptSessions.find((s) => s.id === 'sess-overdue')?.status)
                .toBe('Expired');
        });
    });

    describe('5. Assessment Timer UI & Countdown Formatting', () => {
        it('should format remaining milliseconds into mm:ss accurately', () => {
            // 25 minutes = 1,500,000 ms
            expect(formatRemainingTime(1500000))
                .toEqual({
                    formatted: '25:00',
                    isWarning: false,
                    isExpired: false
                });

            // 4 minutes 30 seconds = 270,000 ms (< 5 min warning)
            expect(formatRemainingTime(270000))
                .toEqual({
                    formatted: '04:30',
                    isWarning: true,
                    isExpired: false
                });

            // 0 ms -> 00:00 expired
            expect(formatRemainingTime(0))
                .toEqual({
                    formatted: '00:00',
                    isWarning: true,
                    isExpired: true
                });
        });

        it('should render countdown and fire onExpire when timer hits 0', () => {
            vi.useFakeTimers();
            const onExpireMock = vi.fn();
            const now = Date.now();
            vi.setSystemTime(now);
            const expiresAt = new Date(now + 3000)
                .toISOString(); // 3 seconds in future

            render(React.createElement(AssessmentTimer, { expiresAt, onExpire: onExpireMock }));

            expect(screen.getByText('00:03'))
                .toBeInTheDocument();

            // Advance time by 1 second
            act(() => {
                vi.advanceTimersByTime(1000);
            });
            expect(screen.getByText('00:02'))
                .toBeInTheDocument();

            // Advance time to expiration
            act(() => {
                vi.advanceTimersByTime(2000);
            });
            expect(screen.getByText('00:00'))
                .toBeInTheDocument();
            expect(onExpireMock)
                .toHaveBeenCalledTimes(1);

            vi.useRealTimers();
        });

        it('should render nothing when expiresAt is null', () => {
            const { container } = render(
                React.createElement(AssessmentTimer, { expiresAt: null, onExpire: vi.fn() })
            );
            expect(container.firstChild)
                .toBeNull();
        });
    });
});