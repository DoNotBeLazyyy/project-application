import { CommonBadgeStatus } from '@components/badge/CommonBadgeStatus';
import CommonButton from '@components/button/CommonButton';
import CommonCard from '@components/card/CommonCard';
import { formatScore } from '@pages/faculty/sections/student-detail/studentDetailFormat';
import GradeBreakdownComponentPanel from '@pages/student/grade/GradeBreakdownComponentPanel';
import { ArrowLeftIcon, InfoIcon } from '@phosphor-icons/react';
import { getMyGradeBreakdown } from '@services/student-portal.service';
import { MyGradeBreakdown } from '@type/student-portal.type';
import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';

interface SummaryTileProps {
    hint: string;
    label: string;
    value: string;
}

function SummaryTile({ hint, label, value }: SummaryTileProps) {
    return (
        <div className="bg-(--mui-palette-action-hover) flex flex-col gap-1 p-3 rounded-lg">
            <span className="font-semibold text-(--mui-palette-text-primary) text-lg">
                {value}
            </span>
            <span className="text-(--mui-palette-text-secondary) text-xs">
                {label}
            </span>
            <span className="text-(--mui-palette-text-disabled) text-xs">
                {hint}
            </span>
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
        <CommonCard className="flex flex-col gap-4 h-full overflow-y-auto p-4 w-full">
            <div className="flex gap-3 items-center">
                <CommonButton
                    color="inherit"
                    size="small"
                    startIcon={<ArrowLeftIcon size={16} weight="bold" />}
                    variant="outlined"
                    onClick={handleBack}
                >
                    Back
                </CommonButton>
                <div className="flex flex-col min-w-0">
                    <div className="flex flex-wrap gap-2 items-center">
                        <h1 className="font-semibold text-(--mui-palette-text-primary) text-xl">
                            {breakdown?.course_code ?? '—'}
                        </h1>
                        <span className="text-(--mui-palette-text-secondary) text-sm truncate">
                            {breakdown?.course_title}
                        </span>
                        {breakdown && (
                            <CommonBadgeStatus label={breakdown.grading_period_name} variant="info" />
                        )}
                    </div>
                    {breakdown && (
                        <div className="flex flex-wrap gap-2 items-center">
                            <span className="text-(--mui-palette-text-secondary) text-sm">
                                {breakdown.section_code}
                            </span>
                            <span className="text-(--mui-palette-text-secondary) text-sm">
                                ·
                            </span>
                            <span className="text-(--mui-palette-text-secondary) text-sm">
                                {breakdown.term_label}
                            </span>
                            <span className="text-(--mui-palette-text-secondary) text-sm">
                                ·
                            </span>
                            <span className="text-(--mui-palette-text-secondary) text-sm">
                                {breakdown.faculty_name}
                            </span>
                        </div>
                    )}
                </div>
            </div>

            {!breakdown && !errorMessage && (
                <p className="py-10 text-(--mui-palette-text-secondary) text-center text-sm">
                    Loading grade breakdown…
                </p>
            )}

            {errorMessage && (
                <div className="flex flex-col gap-2 items-center py-10 text-center">
                    <span className="font-medium text-(--mui-palette-text-primary) text-sm">
                        Breakdown unavailable
                    </span>
                    <span className="max-w-md text-(--mui-palette-text-secondary) text-xs">
                        {errorMessage}
                    </span>
                </div>
            )}

            {breakdown && (
                <>
                    {breakdown.is_published === false && (
                        <div className="border border-(--mui-palette-info-main) bg-(--mui-palette-info-light) p-3 rounded-lg flex items-center gap-3 text-xs text-(--mui-palette-text-primary)">
                            <InfoIcon size={22} className="text-(--mui-palette-info-main) shrink-0" />
                            <div>
                                <span className="font-semibold block text-sm">Grade Pending Official Release</span>
                                <span className="text-(--mui-palette-text-secondary)">Official grades for this period have not yet been published by the Registrar. Computed marks below are indicative drafts.</span>
                            </div>
                        </div>
                    )}
                    <div className="gap-3 grid grid-cols-2 lg:grid-cols-4">
                        <SummaryTile
                            hint="Weighted average of all components"
                            label="Raw Grade"
                            value={formatScore(breakdown.raw_grade)}
                        />
                        <SummaryTile
                            hint="After any faculty adjustment"
                            label="Final Grade"
                            value={formatScore(breakdown.final_grade)}
                        />
                        <SummaryTile
                            hint={breakdown.passing_grade !== null
                                ? `Passing is ${breakdown.passing_grade} or lower`
                                : 'Converted to the grading scale'}
                            label="Transmuted"
                            value={transmutedDisplay}
                        />
                        <SummaryTile
                            hint="Share of your term grade"
                            label="Period Weight"
                            value={`${breakdown.weight}%`}
                        />
                    </div>

                    {breakdown.transmuted_grade !== null && breakdown.passing_grade !== null && (
                        <div className="flex gap-2 items-center">
                            <CommonBadgeStatus
                                label={isPassing
                                    ? 'Passing'
                                    : 'Below passing'}
                                variant={isPassing
                                    ? 'success'
                                    : 'error'}
                            />
                            <span className="text-(--mui-palette-text-secondary) text-xs">
                                Based on the institution passing grade of
                                {' '}
                                {breakdown.passing_grade}
                            </span>
                        </div>
                    )}

                    <div className="flex flex-col gap-2">
                        <div className="flex flex-wrap gap-1 items-baseline justify-between">
                            <span className="font-medium text-(--mui-palette-text-primary) text-sm">
                                Components
                            </span>
                            <span className="text-(--mui-palette-text-secondary) text-xs">
                                Tap a component to see every assessment behind it
                            </span>
                        </div>

                        {breakdown.components.length === 0
                            ? (
                                <p className="italic py-6 text-(--mui-palette-text-secondary) text-sm">
                                    No grading components were configured for this period.
                                </p>
                            )
                            : (
                                <div className="flex flex-col gap-2">
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

                    {breakdown.components.length > 0 && (
                        <div className="border border-(--mui-palette-divider) flex flex-col gap-1 p-3 rounded-lg">
                            <span className="font-medium text-(--mui-palette-text-primary) text-sm">
                                How this grade was computed
                            </span>
                            <span className="text-(--mui-palette-text-secondary) text-xs">
                                {`Each component score is scaled by its weight, summed to ${formatScore(Number(weightedTotal.toFixed(2)))} of ${breakdown.total_component_weight} total component points, then converted to a percentage for the raw grade.`}
                            </span>
                            <span className="text-(--mui-palette-text-secondary) text-xs">
                                Assessments that are not yet graded are excluded from both the earned and the maximum points, so they do not pull your grade down.
                            </span>
                        </div>
                    )}
                </>
            )}
        </CommonCard>
    );
}