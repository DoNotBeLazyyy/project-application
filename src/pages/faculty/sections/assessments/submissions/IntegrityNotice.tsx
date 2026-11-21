import { IntegritySubmission } from '@type/analytics.type';

interface IntegrityNoticeProps {
    integrity: IntegritySubmission | undefined;
}

function formatDuration(totalSeconds: number): string {
    if (totalSeconds < 60) return `${totalSeconds}s`;
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return seconds
        ? `${minutes}m ${seconds}s`
        : `${minutes}m`;
}

/**
 * Whether a submission has anything a teacher should look at.
 */
function hasIntegrityFlag(integrity: IntegritySubmission | undefined): boolean {
    return Boolean(integrity && (
        integrity.focus_lost_count > 0
        || integrity.shared_with.length > 0
        || integrity.distinct_ip_count > 1
    ));
}

/**
 * Integrity summary for one submission, shown above its grading panel. Leaving the quiz
 * screen is not proof of cheating (a notification or a phone call can do it), so the copy
 * says "review" and shows the facts.
 */
export default function IntegrityNotice({ integrity }: IntegrityNoticeProps) {
    if (!integrity) return null;

    if (!hasIntegrityFlag(integrity)) {
        return (
            <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 mb-3 px-3 py-2 rounded-xl shrink-0 text-emerald-800 dark:text-emerald-300 text-xs">
                Stayed on the quiz screen for the whole attempt.
            </div>
        );
    }

    const isShared = integrity.shared_with.length > 0;

    return (
        <div
            className={`border mb-3 px-3 py-2.5 rounded-xl shrink-0 text-xs ${isShared
                ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900 text-rose-900 dark:text-rose-200'
                : 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900 text-amber-900 dark:text-amber-200'}`}
        >
            <span className="block font-semibold mb-1">Review this attempt</span>
            <ul className="flex flex-col gap-0.5 list-disc m-0 pl-4">
                {integrity.focus_lost_count > 0 && (
                    <li>
                        Left the quiz screen {integrity.focus_lost_count} time{integrity.focus_lost_count === 1
                            ? ''
                            : 's'}, away {formatDuration(integrity.total_away_seconds)} in total
                        (longest {formatDuration(integrity.longest_away_seconds)}).
                    </li>
                )}
                {integrity.distinct_ip_count > 1 && (
                    <li>
                        Answered from {integrity.distinct_ip_count} different networks during the attempt.
                    </li>
                )}
                {isShared && (
                    <li>
                        Same network as {integrity.shared_with
                            .map((peer) => `${peer.full_name} (${peer.student_number})`)
                            .join(', ')} while both were taking this quiz.
                    </li>
                )}
            </ul>
        </div>
    );
}