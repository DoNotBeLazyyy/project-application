import { CommonBadgeStatus } from '@components/badge/CommonBadgeStatus';
import CommonSelect from '@components/select/CommonSelect';
import SubmissionDetailModal from '@pages/faculty/sections/student-detail/SubmissionDetailModal';
import { formatDate, formatScore, submissionStatusVariant } from '@pages/faculty/sections/student-detail/studentDetailFormat';
import { StudentEvaluationAssessment } from '@type/faculty.type';
import { useMemo, useState } from 'react';

const ALL_VALUE = 'all';

interface StudentAssessmentTabProps {
    assessments: StudentEvaluationAssessment[];
}

export default function StudentAssessmentTab({ assessments }: StudentAssessmentTabProps) {
    const [typeFilter, setTypeFilter] = useState<string>(ALL_VALUE);
    const [periodFilter, setPeriodFilter] = useState<string>(ALL_VALUE);
    const [statusFilter, setStatusFilter] = useState<string>(ALL_VALUE);
    const [detailItem, setDetailItem] = useState<StudentEvaluationAssessment | null>(null);

    const typeOptions = useMemo(function() {
        const present = Array.from(new Set(assessments.map((item) => item.assessment_type)));
        return [
            { label: 'All Types', value: ALL_VALUE },
            ...present.map((type) => ({ label: type, value: type }))
        ];
    }, [assessments]);

    const periodOptions = useMemo(function() {
        const seen = new Map<string, { name: string; sequence: number }>();

        assessments.forEach(function(item) {
            if (item.grading_period_id && item.grading_period_name && !seen.has(item.grading_period_id)) {
                seen.set(item.grading_period_id, {
                    name: item.grading_period_name,
                    sequence: item.grading_period_sequence ?? 0
                });
            }
        });

        const sorted = Array.from(seen.entries())
            .sort((a, b) => a[1].sequence - b[1].sequence)
            .map(([id, meta]) => ({ label: meta.name, value: id }));

        return [{ label: 'All Periods', value: ALL_VALUE }, ...sorted];
    }, [assessments]);

    const statusOptions = useMemo(function() {
        const present = Array.from(
            new Set(
                assessments
                    .map((item) => item.submission_status)
                    .filter((status): status is string => Boolean(status))
            )
        );

        return [
            { label: 'All Statuses', value: ALL_VALUE },
            ...present.map((status) => ({ label: status, value: status }))
        ];
    }, [assessments]);

    const filtered = useMemo(function() {
        return assessments.filter(function(item) {
            const matchesType = typeFilter === ALL_VALUE || item.assessment_type === typeFilter;
            const matchesPeriod = periodFilter === ALL_VALUE || item.grading_period_id === periodFilter;
            const matchesStatus = statusFilter === ALL_VALUE || item.submission_status === statusFilter;

            return matchesType && matchesPeriod && matchesStatus;
        });
    }, [assessments, typeFilter, periodFilter, statusFilter]);

    return (
        <div className="flex flex-1 flex-col gap-3 min-h-0">
            {/* Filters */}
            <div className="gap-2 grid grid-cols-1 sm:grid-cols-3">
                <CommonSelect
                    fullWidth
                    options={typeOptions}
                    size="small"
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                />
                <CommonSelect
                    fullWidth
                    options={periodOptions}
                    size="small"
                    value={periodFilter}
                    onChange={(e) => setPeriodFilter(e.target.value)}
                />
                <CommonSelect
                    fullWidth
                    options={statusOptions}
                    size="small"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                />
            </div>

            {/* Bento Cards Grid */}
            <div className="flex-1 min-h-0 overflow-y-auto">
                {filtered.length === 0 ? (
                    <div className="py-12 text-center text-slate-500 text-xs">
                        No assessment records match the selected filters.
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-4">
                        {filtered.map((item: any) => (
                            <div
                                key={item.assessment_id || item.id}
                                onClick={() => setDetailItem(item)}
                                className="bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 rounded-2xl p-3.5 shadow-2xs hover:shadow-xs hover:border-blue-400 dark:hover:border-blue-600 transition-all cursor-pointer flex flex-col justify-between gap-2.5"
                            >
                                <div>
                                    <div className="flex items-center justify-between gap-2 mb-1.5">
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                                                {item.assessment_type}
                                            </span>
                                            {item.grading_period_name && (
                                                <span className="text-[10px] font-semibold text-slate-500">
                                                    {item.grading_period_name}
                                                </span>
                                            )}
                                        </div>

                                        <CommonBadgeStatus
                                            label={item.submission_status ?? 'Not submitted'}
                                            variant={submissionStatusVariant(item.submission_status ?? null)}
                                        />
                                    </div>

                                    <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100 line-clamp-2">
                                        {item.title}
                                    </h4>
                                </div>

                                <div className="border-t border-slate-100 dark:border-zinc-800/80 pt-2 flex items-center justify-between text-xs">
                                    <span className="text-slate-400">
                                        Submitted: {formatDate(item.submitted_at)}
                                    </span>
                                    <span className="font-bold text-slate-900 dark:text-slate-100">
                                        Score: {formatScore(item.final_score)} / {item.total_points}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <SubmissionDetailModal
                assessment={detailItem as any}
                onClose={() => setDetailItem(null)}
            />
        </div>
    );
}