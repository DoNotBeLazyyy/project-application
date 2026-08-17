import { CommonBadgeStatus } from '@components/badge/CommonBadgeStatus';
import { CommonChip } from '@components/badge/CommonChip';
import InsightStatTile from '@pages/shared/analytics/InsightStatTile';
import { getAssessmentIntegrityReport } from '@services/analytics.service';
import { AssessmentIntegrityReport, IntegritySubmission } from '@type/analytics.type';
import { useEffect, useState } from 'react';

interface IntegrityReportViewProps {
    assessmentId: string;
}

function formatDuration(seconds: number): string {
    if (seconds <= 0) return '—';

    const minutes = Math.floor(seconds / 60);
    const remainder = seconds % 60;

    return minutes > 0
        ? `${minutes}m ${remainder}s`
        : `${remainder}s`;
}

function formatTimestamp(value: string | null): string {
    return value
        ? new Date(value)
            .toLocaleString()
        : '—';
}

interface SubmissionRowProps {
    submission: IntegritySubmission;
}

function SubmissionRow({ submission }: SubmissionRowProps) {
    const hasFocusFlag = submission.focus_lost_count > 0;
    const hasSharedIp = submission.shared_with.length > 0;
    const hasRoamingIp = submission.distinct_ip_count > 1;

    return (
        <div className="border border-(--mui-palette-divider) flex flex-col gap-3 p-4 rounded-lg">
            <div className="flex flex-wrap gap-3 items-start justify-between">
                <div className="flex flex-col gap-0.5 min-w-0">
                    <span className="font-medium text-(--mui-palette-text-primary) text-sm">
                        {submission.full_name}
                    </span>
                    <span className="text-(--mui-palette-text-secondary) text-xs">
                        {submission.student_number} · Attempt {submission.attempt_number} · {submission.status}
                    </span>
                    <span className="text-(--mui-palette-text-secondary) text-xs">
                        {formatTimestamp(submission.started_at)} → {formatTimestamp(submission.submitted_at)}
                    </span>
                </div>
                <div className="flex flex-wrap gap-2">
                    {hasFocusFlag && (
                        <CommonBadgeStatus
                            label={`Left tab ${submission.focus_lost_count}×`}
                            variant="warning"
                        />
                    )}
                    {hasRoamingIp && (
                        <CommonBadgeStatus
                            label={`${submission.distinct_ip_count} networks`}
                            variant="error"
                        />
                    )}
                    {hasSharedIp && (
                        <CommonBadgeStatus
                            label="Shared network"
                            variant="info"
                        />
                    )}
                    {!hasFocusFlag && !hasRoamingIp && !hasSharedIp && (
                        <CommonBadgeStatus
                            label="No signals"
                            variant="success"
                        />
                    )}
                </div>
            </div>

            {hasFocusFlag && (
                <div className="flex flex-wrap gap-4">
                    <span className="text-(--mui-palette-text-secondary) text-xs">
                        Total away: {formatDuration(submission.total_away_seconds)}
                    </span>
                    <span className="text-(--mui-palette-text-secondary) text-xs">
                        Longest single absence: {formatDuration(submission.longest_away_seconds)}
                    </span>
                </div>
            )}

            {submission.ip_addresses.length > 0 && (
                <div className="flex flex-wrap gap-1 items-center">
                    <span className="text-(--mui-palette-text-secondary) text-xs">
                        Addresses:
                    </span>
                    {submission.ip_addresses.map(function(address) {
                        return (
                            <CommonChip
                                key={address}
                                label={address}
                                size="small"
                                variant="outline"
                            />
                        );
                    })}
                </div>
            )}

            {hasSharedIp && (
                <div className="flex flex-col gap-1">
                    <span className="text-(--mui-palette-text-secondary) text-xs">
                        Overlapped on the same address as:
                    </span>
                    {submission.shared_with.map(function(peer) {
                        return (
                            <span
                                className="text-(--mui-palette-text-primary) text-xs"
                                key={`${peer.student_number}-${peer.ip_address}`}
                            >
                                {peer.full_name} ({peer.student_number}) on {peer.ip_address}
                            </span>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

export default function IntegrityReportView({ assessmentId }: IntegrityReportViewProps) {
    const [report, setReport] = useState<AssessmentIntegrityReport | null>(null);
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(function() {
        async function fetchReport() {
            const result = await getAssessmentIntegrityReport(assessmentId);
            if (result.data) setReport(result.data);
            setIsLoaded(true);
        }

        fetchReport();
    }, [assessmentId]);

    if (!isLoaded) {
        return (
            <p className="text-(--mui-palette-text-secondary) text-sm">
                Loading...
            </p>
        );
    }

    if (!report || !report.success) {
        return (
            <p className="text-(--mui-palette-text-secondary) text-sm">
                {report?.message ?? 'The integrity report is not available.'}
            </p>
        );
    }

    const { summary } = report;

    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-col">
                <h1 className="font-semibold text-(--mui-palette-text-primary) text-xl">
                    Integrity Report
                </h1>
                <span className="text-(--mui-palette-text-secondary) text-sm">
                    {report.assessment.title} · {report.assessment.course_code} · {report.assessment.section_code}
                </span>
            </div>

            <div className="bg-(--mui-palette-action-hover) flex flex-col gap-1 p-3 rounded-lg">
                <span className="font-medium text-(--mui-palette-text-primary) text-sm">
                    Read these as signals, not proof.
                </span>
                <span className="text-(--mui-palette-text-secondary) text-xs">
                    Notifications, dropped connections and assistive tools all register as leaving
                    the tab. Students on one campus network or in one household share an address.
                    Use this to decide who is worth a conversation, never as evidence on its own.
                </span>
            </div>

            <div className="gap-3 grid grid-cols-2 md:grid-cols-4">
                <InsightStatTile
                    label="Submissions"
                    value={String(summary.submission_count)}
                />
                <InsightStatTile
                    hint="Left the tab at least once"
                    label="Tab Exits"
                    value={String(summary.focus_flagged_count)}
                />
                <InsightStatTile
                    hint="Overlapping attempts, same address"
                    label="Shared Network"
                    value={String(summary.shared_ip_count)}
                />
                <InsightStatTile
                    hint="Attempt spanned several addresses"
                    label="Network Changes"
                    value={String(summary.roaming_ip_count)}
                />
            </div>

            <div className="flex flex-col gap-3">
                <h2 className="font-semibold text-(--mui-palette-text-primary) text-base">
                    Submissions
                </h2>
                {report.submissions.length > 0
                    ? (
                        <div className="flex flex-col gap-3">
                            {report.submissions.map(function(submission) {
                                return (
                                    <SubmissionRow
                                        key={submission.submission_id}
                                        submission={submission}
                                    />
                                );
                            })}
                        </div>
                    )
                    : (
                        <p className="text-(--mui-palette-text-secondary) text-sm">
                            No attempts have been made on this assessment yet.
                        </p>
                    )}
            </div>
        </div>
    );
}