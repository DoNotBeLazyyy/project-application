import { CommonBadgeStatus } from '@components/badge/CommonBadgeStatus';
import CommonButton from '@components/button/CommonButton';
import StatCard from '@components/card/StatCard';
import CommonModal from '@components/modal/CommonModal';
import CommonProgressBar from '@components/progress-bar/CommonProgressBar';
import {
    CalculatorIcon,
    CheckCircleIcon,
    ClockIcon,
    GraduationCapIcon,
    SealCheckIcon,
    TargetIcon,
    XIcon
} from '@phosphor-icons/react';
import { getFacultyStudentGradeBreakdown } from '@services/faculty.service';
import { FacultyStudentGradeBreakdown } from '@type/faculty.type';
import { formatShortDate } from '@utils/date.util';
import { useEffect, useState } from 'react';

interface StudentGradeBreakdownModalProps {
    enrollmentId: string;
    gradingPeriodId: string;
    open: boolean;
    onClose: VoidFunction;
}

export default function StudentGradeBreakdownModal({
    enrollmentId,
    gradingPeriodId,
    onClose,
    open
}: StudentGradeBreakdownModalProps) {
    const [data, setData] = useState<FacultyStudentGradeBreakdown | null>(null);

    useEffect(function() {
        if (open && enrollmentId && gradingPeriodId) {
            async function fetchData() {
                const result = await getFacultyStudentGradeBreakdown(enrollmentId, gradingPeriodId);
                if (result.data) {
                    setData(result.data);
                }
            }

            fetchData();
        }
    }, [open, enrollmentId, gradingPeriodId]);

    // Same formula as fn_calculate_final_grade: each component adds (earned / max) x weight,
    // and the sum is divided by the total of all weights. A component with nothing counted adds 0.
    const components = data?.components ?? [];
    const totalWeight = components.reduce((sum, c) => sum + Number(c.weight ?? 0), 0);
    const totalWeighted = components.reduce((sum, c) => sum + Number(c.weighted_score ?? 0), 0);
    const computedRaw = totalWeight > 0
        ? Math.min(100, Math.max(0, (totalWeighted / totalWeight) * 100))
        : 0;
    // The card shows the grade the server saved; the formula below shows how it is computed
    const savedRaw = Number(data?.raw_grade ?? 0);
    const isSavedStale = Boolean(data) && totalWeight > 0 && Math.abs(savedRaw - computedRaw) >= 0.01;

    return (
        <CommonModal
            open={open}
            onClose={onClose}
        >
            <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 flex flex-col gap-6 max-h-[85vh] max-w-4xl overflow-y-auto p-5 sm:p-7 rounded-2xl shadow-xl w-full">
                {/* Header */}
                <div className="flex items-start justify-between border-b border-slate-200/80 dark:border-zinc-800 pb-4">
                    <div className="flex flex-col gap-1">
                        <div className="flex flex-wrap gap-2 items-center">
                            <h2 className="font-bold text-slate-900 dark:text-slate-100 text-xl m-0 tracking-tight">
                                {data?.student_name ?? 'Student Grade Audit'}
                            </h2>
                            {data?.status && (
                                <CommonBadgeStatus
                                    label={data.status}
                                    variant={data.status === 'Draft'
                                        ? 'warning'
                                        : 'success'}
                                />
                            )}
                        </div>
                        <span className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                            {data?.student_number} · {data?.course_code} ({data?.section_code}) — {data?.grading_period_name}
                        </span>
                    </div>
                    <button
                        className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
                        type="button"
                        onClick={onClose}
                    >
                        <XIcon size={20} />
                    </button>
                </div>

                {/* Metric Summary Cards Grid */}
                {/* The raw percentage is computed from the components shown below, so the card, the
                    formula and the itemization agree even before the grade sheet is calculated */}
                <div className="gap-3 sm:gap-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                    <StatCard
                        hint="Weighted scores ÷ total weight"
                        icon={<CalculatorIcon size={22} />}
                        iconBg="bg-blue-50 dark:bg-blue-950/60"
                        iconColor="text-blue-600 dark:text-blue-400"
                        label="Raw Percentage"
                        value={`${savedRaw.toFixed(2)}%`}
                    />
                    <StatCard
                        hint="Transmuted institutional GPA"
                        icon={<GraduationCapIcon size={22} />}
                        iconBg="bg-purple-50 dark:bg-purple-950/60"
                        iconColor="text-purple-600 dark:text-purple-400"
                        label="Transmuted Grade"
                        value={data?.transmuted_grade ?? '—'}
                    />
                    <StatCard
                        hint="Special grade override"
                        icon={<SealCheckIcon size={22} />}
                        iconBg="bg-amber-50 dark:bg-amber-950/60"
                        iconColor="text-amber-600 dark:text-amber-400"
                        label="Special Grade"
                        value={data?.special_grade ?? 'None'}
                    />
                    <StatCard
                        hint="Passing mark on the 1.00 to 5.00 scale"
                        icon={<TargetIcon size={22} />}
                        iconBg="bg-emerald-50 dark:bg-emerald-950/60"
                        iconColor="text-emerald-600 dark:text-emerald-400"
                        label="Passing Grade"
                        value={Number(data?.passing_grade ?? 3)
                            .toFixed(2)}
                    />
                </div>

                {/* Formula Breakdown Card: shows the same arithmetic the server uses */}
                {components.length > 0 && (
                    <div className="bg-slate-50 dark:bg-zinc-800/40 border border-slate-200/80 dark:border-zinc-800 flex flex-col gap-2 p-4 rounded-xl text-xs">
                        <span className="font-semibold text-slate-900 dark:text-slate-200 text-sm">
                            How the raw grade is computed
                        </span>
                        <div className="flex flex-col font-mono gap-1 leading-relaxed text-slate-600 dark:text-slate-300">
                            {components.map((c) => (
                                <span key={c.id}>
                                    {c.name}:{' '}
                                    {c.percentage === null
                                        ? `no graded items yet, counts as 0% × ${c.weight} = 0.00`
                                        : `${c.earned_points} / ${c.max_points} = ${c.percentage.toFixed(2)}% × ${c.weight} = ${Number(c.weighted_score)
                                            .toFixed(2)}`}
                                </span>
                            ))}
                            <span className="border-slate-200 dark:border-zinc-700 border-t mt-1 pt-1">
                                Sum of weighted scores = {totalWeighted.toFixed(2)}
                            </span>
                            <span>
                                Raw Grade = {totalWeighted.toFixed(2)} ÷ {totalWeight} (total weight) × 100 ={' '}
                                <strong className="text-blue-600 dark:text-blue-400">
                                    {computedRaw.toFixed(2)}%
                                </strong>
                            </span>
                            {isSavedStale && (
                                <span className="font-sans text-amber-700 dark:text-amber-300">
                                    The saved raw grade ({savedRaw.toFixed(2)}%) is from an earlier calculation. Click &quot;Calculate&quot; on the grade sheet to update it.
                                </span>
                            )}
                        </div>
                    </div>
                )}

                {/* Grading Component Itemization */}
                <div className="flex flex-col gap-3">
                    <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base m-0">
                        Grading Component Audit Breakdown
                    </h3>

                    {(!data?.components || data.components.length === 0) && (
                        <p className="m-0 py-8 text-center text-slate-500 text-sm italic">
                            No grading components defined for this period.
                        </p>
                    )}

                    {data?.components.map(function(comp) {
                        const pct = comp.percentage ?? 0;

                        return (
                            <div
                                className="bg-white dark:bg-zinc-900 flex flex-col gap-3 border border-slate-200/90 dark:border-zinc-800 p-4 rounded-xl shadow-2xs"
                                key={comp.id}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex flex-col gap-0.5">
                                        <div className="flex gap-2 items-center">
                                            <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                                                {comp.name}
                                            </span>
                                            <span className="rounded-md bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 font-semibold text-blue-700 dark:text-blue-300 text-xs border border-blue-200/60 dark:border-blue-800/60">
                                                Weight: {comp.weight}%
                                            </span>
                                        </div>
                                        <span className="text-slate-500 dark:text-slate-400 text-xs">
                                            {comp.percentage === null
                                                ? 'No graded items yet, counts as 0%'
                                                : `Earned ${comp.earned_points} / ${comp.max_points} pts (${pct.toFixed(2)}%)`}
                                        </span>
                                    </div>
                                    <div className="flex flex-col items-end">
                                        <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                                            +{Number(comp.weighted_score)
                                                .toFixed(2)}
                                        </span>
                                        <span className="text-slate-400 text-[11px]">
                                            of {comp.weight} weight
                                        </span>
                                    </div>
                                </div>

                                <CommonProgressBar
                                    percentage={pct}
                                    type="bar"
                                />

                                {comp.items.length > 0 && (
                                    <div className="mt-1 flex flex-col gap-2 border-t border-slate-100 dark:border-zinc-800/80 pt-3">
                                        <span className="font-semibold text-slate-500 dark:text-slate-400 text-[11px] uppercase tracking-wider">
                                            Itemized Assessments ({comp.graded_count}/{comp.items.length} graded)
                                        </span>
                                        <div className="flex flex-col gap-1.5">
                                            {comp.items.map(function(item) {
                                                return (
                                                    <div
                                                        className="bg-slate-50/60 dark:bg-zinc-800/40 flex items-center justify-between px-3 py-2 border border-slate-200/70 dark:border-zinc-800 rounded-lg"
                                                        key={item.id}
                                                    >
                                                        <div className="flex gap-2 items-center">
                                                            {item.is_counted
                                                                ? (
                                                                    <CheckCircleIcon
                                                                        className="text-emerald-500 shrink-0"
                                                                        size={16}
                                                                        weight="fill"
                                                                    />
                                                                )
                                                                : (
                                                                    <ClockIcon
                                                                        className="text-amber-500 shrink-0"
                                                                        size={16}
                                                                    />
                                                                )}
                                                            <div className="flex flex-col">
                                                                <span className="font-medium text-slate-900 dark:text-slate-100 text-xs">
                                                                    {item.title}
                                                                </span>
                                                                <span className="text-slate-400 text-[11px]">
                                                                    {item.assessment_type} · Due {formatShortDate(item.due_at)}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-bold text-slate-900 dark:text-slate-100 text-xs">
                                                                {item.earned_points !== null
                                                                    ? `${item.earned_points} / ${item.max_points} pts`
                                                                    : `Not graded (${item.max_points} max pts)`}
                                                            </span>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                <div className="flex justify-end pt-3 border-t border-slate-200/80 dark:border-zinc-800">
                    <CommonButton
                        color="inherit"
                        size="small"
                        variant="outlined"
                        onClick={onClose}
                    >
                        Close Audit
                    </CommonButton>
                </div>
            </div>
        </CommonModal>
    );
}