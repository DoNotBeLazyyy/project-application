import { CommonBadgeStatus } from '@components/badge/CommonBadgeStatus';
import CommonButton from '@components/button/CommonButton';
import CommonCard from '@components/card/CommonCard';
import { formatScore } from '@pages/faculty/sections/student-detail/studentDetailFormat';
import GradeBreakdownComponentPanel from '@pages/student/grade/GradeBreakdownComponentPanel';
import {
    ArrowLeftIcon,
    CalculatorIcon,
    CalendarDotsIcon,
    ChalkboardTeacherIcon,
    CheckCircleIcon,
    GraduationCapIcon,
    TrendUpIcon,
    WarningCircleIcon
} from '@phosphor-icons/react';
import { getMyGradeBreakdown } from '@services/student-portal.service';
import { MyGradeBreakdown } from '@type/student-portal.type';
import { ReactNode, useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';

interface GradeMetricCardProps {
    hint: string;
    icon: ReactNode;
    iconBg: string;
    iconColor: string;
    label: string;
    value: string;
}

function GradeMetricCard({ hint, icon, iconBg, iconColor, label, value }: GradeMetricCardProps) {
    return (
        <div className="bg-slate-50/70 dark:bg-zinc-800/60 border border-slate-200/80 dark:border-zinc-800 flex items-center gap-3.5 p-3.5 sm:p-4 rounded-2xl shadow-2xs transition-all min-w-0">
            <div className={`flex h-11 w-11 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-xl ${iconBg}`}>
                <span className={`flex items-center justify-center ${iconColor}`}>
                    {icon}
                </span>
            </div>
            <div className="flex flex-col gap-0.5 min-w-0 text-left">
                <span className="font-bold text-xl sm:text-2xl text-slate-900 dark:text-slate-100 truncate tracking-tight">
                    {value}
                </span>
                <span className="font-medium text-xs sm:text-sm text-slate-700 dark:text-slate-300 truncate">
                    {label}
                </span>
                <span className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 truncate">
                    {hint}
                </span>
            </div>
        </div>
    );
}

export default function GradeBreakdownPage() {
    const { enrollmentId = '', gradingPeriodId = '' } = useParams<{ enrollmentId: string; gradingPeriodId: string }>();
    const navigate = useNavigate();
    const location = useLocation();
    const [breakdown, setBreakdown] = useState<MyGradeBreakdown | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    useEffect(function() {
        if (!enrollmentId || !gradingPeriodId) {
            return;
        }

        async function fetchBreakdown() {
            const result = await getMyGradeBreakdown(enrollmentId, gradingPeriodId);

            if (result.data) {
                setBreakdown(result.data);
                setErrorMessage(null);
                return;
            }

            setBreakdown(null);
            setErrorMessage(result.error?.message ?? 'This grade breakdown is not available.');
        }

        fetchBreakdown();
    }, [enrollmentId, gradingPeriodId]);

    function handleBack() {
        if (location.key === 'default') {
            navigate('/student/grade');
            return;
        }

        navigate(-1);
    }

    const transmutedDisplay = breakdown
        ? breakdown.special_grade
            ?? (breakdown.transmuted_grade !== null
                ? String(breakdown.transmuted_grade)
                : '—')
        : '—';
    const isPassing = breakdown?.transmuted_grade !== null
        && breakdown?.transmuted_grade !== undefined
        && breakdown.passing_grade !== null
        && breakdown.transmuted_grade <= breakdown.passing_grade;
    const weightedTotal = breakdown
        ? breakdown.components.reduce(function(total, component) {
            return total + component.weighted_score;
        }, 0)
        : 0;

    return (
        <CommonCard
            className="flex flex-col gap-5 min-h-full p-4 sm:p-6 w-full"
            style={{ overflow: 'visible' }}
        >
            {/* Header with Navigation and Course Identity */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/80 dark:border-zinc-800">
                <div className="flex items-start sm:items-center gap-3 min-w-0">
                    <CommonButton
                        color="inherit"
                        size="small"
                        startIcon={(
                            <ArrowLeftIcon
                                size={16}
                                weight="bold"
                            />
                        )}
                        variant="outlined"
                        onClick={handleBack}
                    >
                        Back
                    </CommonButton>
                    <div className="flex flex-col min-w-0">
                        <div className="flex flex-wrap gap-2 items-center">
                            <span className="font-mono font-bold text-sm sm:text-base px-2.5 py-0.5 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 shrink-0">
                                {breakdown?.course_code ?? '—'}
                            </span>
                            <h1 className="font-bold text-slate-900 dark:text-slate-100 text-lg sm:text-xl truncate tracking-tight">
                                {breakdown?.course_title ?? 'Grade Breakdown'}
                            </h1>
                            {breakdown && (
                                <CommonBadgeStatus
                                    label={breakdown.grading_period_name}
                                    variant="info"
                                />
                            )}
                        </div>
                        {breakdown && (
                            <div className="flex flex-wrap gap-2.5 items-center mt-1 text-xs text-slate-500 dark:text-slate-400">
                                <span className="font-medium bg-slate-100 dark:bg-zinc-800 px-2.5 py-0.5 rounded-md">
                                    Section {breakdown.section_code}
                                </span>
                                <span className="flex items-center gap-1 font-medium bg-slate-100 dark:bg-zinc-800 px-2.5 py-0.5 rounded-md">
                                    <CalendarDotsIcon size={14} />
                                    {breakdown.term_label}
                                </span>
                                {breakdown.faculty_name && (
                                    <span className="flex items-center gap-1 font-medium bg-slate-100 dark:bg-zinc-800 px-2.5 py-0.5 rounded-md">
                                        <ChalkboardTeacherIcon size={14} />
                                        {breakdown.faculty_name}
                                    </span>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {!breakdown && !errorMessage && (
                <div className="py-16 text-center text-slate-500 dark:text-slate-400 text-sm">
                    Loading grade breakdown…
                </div>
            )}

            {errorMessage && (
                <div className="flex flex-col gap-2 items-center py-16 text-center">
                    <WarningCircleIcon
                        className="text-amber-500"
                        size={36}
                    />
                    <span className="font-semibold text-slate-900 dark:text-slate-100 text-base">
                        Breakdown unavailable
                    </span>
                    <span className="max-w-md text-slate-500 text-xs">
                        {errorMessage}
                    </span>
                </div>
            )}

            {breakdown && (
                <>
                    {/* Metric Cards Grid */}
                    <div className="gap-3 sm:gap-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                        <GradeMetricCard
                            hint="Weighted average of all components"
                            icon={<CalculatorIcon size={24} />}
                            iconBg="bg-blue-50 dark:bg-blue-950/60"
                            iconColor="text-blue-600 dark:text-blue-400"
                            label="Raw Grade"
                            value={formatScore(breakdown.raw_grade)}
                        />
                        <GradeMetricCard
                            hint="After faculty adjustments"
                            icon={<CheckCircleIcon size={24} />}
                            iconBg="bg-emerald-50 dark:bg-emerald-950/60"
                            iconColor="text-emerald-600 dark:text-emerald-400"
                            label="Final Grade"
                            value={formatScore(breakdown.final_grade)}
                        />
                        <GradeMetricCard
                            hint={breakdown.passing_grade !== null
                                ? `Passing is ${breakdown.passing_grade} or lower`
                                : 'Converted to grading scale'}
                            icon={<GraduationCapIcon size={24} />}
                            iconBg="bg-purple-50 dark:bg-purple-950/60"
                            iconColor="text-purple-600 dark:text-purple-400"
                            label="Transmuted"
                            value={transmutedDisplay}
                        />
                        <GradeMetricCard
                            hint="Share of term grade"
                            icon={<TrendUpIcon size={24} />}
                            iconBg="bg-amber-50 dark:bg-amber-950/60"
                            iconColor="text-amber-600 dark:text-amber-400"
                            label="Period Weight"
                            value={`${breakdown.weight}%`}
                        />
                    </div>

                    {breakdown.transmuted_grade !== null && breakdown.passing_grade !== null && (
                        <div className="flex flex-wrap gap-2 items-center px-1">
                            <CommonBadgeStatus
                                label={isPassing
                                    ? 'Passing Standing'
                                    : 'Below Passing Threshold'}
                                variant={isPassing
                                    ? 'success'
                                    : 'error'}
                            />
                            <span className="text-slate-500 dark:text-slate-400 text-xs">
                                Institution passing grade benchmark: <strong>{breakdown.passing_grade}</strong>
                            </span>
                        </div>
                    )}

                    {/* Components Accordion List */}
                    <div className="flex flex-col gap-3">
                        <div className="flex flex-wrap gap-1 items-baseline justify-between px-0.5">
                            <span className="font-bold text-slate-900 dark:text-slate-100 text-base">
                                Component Itemization
                            </span>
                            <span className="text-slate-500 dark:text-slate-400 text-xs">
                                Tap any component to expand the assessments behind it
                            </span>
                        </div>

                        {breakdown.components.length === 0
                            ? (
                                <p className="italic py-8 text-center text-slate-500 dark:text-slate-400 text-sm">
                                No grading components were configured for this period.
                                </p>
                            )
                            : (
                                <div className="flex flex-col gap-2.5">
                                    {breakdown.components.map(function(component) {
                                        return (
                                            <GradeBreakdownComponentPanel
                                                component={component}
                                                defaultExpanded={breakdown.components.length === 1}
                                                key={component.id}
                                            />
                                        );
                                    })}
                                </div>
                            )}
                    </div>

                    {/* Grade Computation Information Card */}
                    {breakdown.components.length > 0 && (
                        <div className="bg-slate-50 dark:bg-zinc-800/40 border border-slate-200/80 dark:border-zinc-800 flex flex-col gap-1.5 p-4 rounded-xl text-xs">
                            <span className="font-semibold text-slate-900 dark:text-slate-200 text-sm">
                                How this grade was computed
                            </span>
                            <span className="text-slate-600 dark:text-slate-400 leading-relaxed">
                                {`Each component score is calculated from your earned assessment points against total component points, scaled by the component weight (summing to ${formatScore(Number(weightedTotal.toFixed(2)))} of ${breakdown.total_component_weight} total component points) to yield your Raw Grade.`}
                            </span>
                            <span className="text-slate-500 dark:text-slate-500 leading-relaxed">
                                Your raw grade percentage is then converted into the official transmuted grade based on the institutional grading table. Assessments without submissions or scores receive 0 points toward the released component grade.
                            </span>
                        </div>
                    )}
                </>
            )}
        </CommonCard>
    );
}