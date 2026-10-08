import { CommonBadgeStatus } from '@components/badge/CommonBadgeStatus';
import CommonButton from '@components/button/CommonButton';
import CommonSelect, { CommonSelectOption } from '@components/select/CommonSelect';
import {
    ArrowCounterClockwiseIcon,
    CalculatorIcon,
    CheckCircleIcon,
    SparkleIcon,
    TrophyIcon,
    WarningCircleIcon
} from '@phosphor-icons/react';
import { InsightAcademic, InsightCourse, InsightTrajectory } from '@type/analytics.type';
import { useMemo, useState } from 'react';

interface WhatIfGradeSimulatorProps {
    academic: InsightAcademic;
    courses: InsightCourse[];
    trajectory: InsightTrajectory[];
}

const GRADE_OPTIONS: CommonSelectOption[] = [
    { label: '1.00 (99–100% · Excellent)', value: '1.00' },
    { label: '1.25 (96–98% · Superior)', value: '1.25' },
    { label: '1.50 (93–95% · Very Good)', value: '1.50' },
    { label: '1.75 (90–92% · Good)', value: '1.75' },
    { label: '2.00 (87–89% · Meritorious)', value: '2.00' },
    { label: '2.25 (84–86% · Satisfactory)', value: '2.25' },
    { label: '2.50 (81–83% · Fair)', value: '2.50' },
    { label: '2.75 (78–80% · Passing)', value: '2.75' },
    { label: '3.00 (75–77% · Conditional)', value: '3.00' },
    { label: '5.00 (Below 75% · Failed)', value: '5.00' }
];

function formatGwa(val: number | null): string {
    return val !== null && val !== undefined ? val.toFixed(2) : '—';
}

export default function WhatIfGradeSimulator({ academic, courses, trajectory }: WhatIfGradeSimulatorProps) {
    const [isSimulating, setIsSimulating] = useState(false);

    // Initial state map: enrollment_id -> simulated transmuted grade
    const initialSimMap = useMemo(function() {
        const map: Record<string, string> = {};
        courses.forEach(function(course) {
            map[course.enrollment_id] = course.released_grade
                ? course.released_grade.toFixed(2)
                : '1.25';
        });

        return map;
    }, [courses]);

    const [simulatedGrades, setSimulatedGrades] = useState<Record<string, string>>(initialSimMap);

    function handleGradeChange(enrollmentId: string, val: string) {
        setSimulatedGrades(function(prev) {
            return {
                ...prev,
                [enrollmentId]: val
            };
        });
        if (!isSimulating) {
            setIsSimulating(true);
        }
    }

    function handleReset() {
        setSimulatedGrades(initialSimMap);
        setIsSimulating(false);
    }

    // Calculation of Simulated Term & Cumulative GWA
    const simulationResults = useMemo(function() {
        if (courses.length === 0) {
            return {
                simulatedTermGwa: academic.term_gwa,
                simulatedCumGwa: academic.cumulative_gwa,
                delta: 0
            };
        }

        let termTotalWeighted = 0;
        let termTotalUnits = 0;

        courses.forEach(function(c) {
            const gradeVal = parseFloat(simulatedGrades[c.enrollment_id] || '1.25');
            const courseUnits = 3.0; // standard subject unit load
            termTotalWeighted += gradeVal * courseUnits;
            termTotalUnits += courseUnits;
        });

        const simTermGwa = termTotalUnits > 0 ? termTotalWeighted / termTotalUnits : 0;

        // Cumulative Calculation
        const currentCum = academic.cumulative_gwa || simTermGwa;
        const currentEarnedUnits = academic.earned_units || 0;

        const totalCumWeighted = (currentCum * currentEarnedUnits) + termTotalWeighted;
        const totalCumUnits = currentEarnedUnits + termTotalUnits;

        const simCumGwa = totalCumUnits > 0 ? totalCumWeighted / totalCumUnits : currentCum;
        const delta = academic.cumulative_gwa ? simCumGwa - academic.cumulative_gwa : 0;

        return {
            simulatedTermGwa: Number(simTermGwa.toFixed(2)),
            simulatedCumGwa: Number(simCumGwa.toFixed(2)),
            delta: Number(delta.toFixed(2))
        };
    }, [courses, simulatedGrades, academic]);

    // Evaluates qualification based on simulated cumulative GWA
    const honorTrajectoryEval = useMemo(function() {
        const cumGwa = simulationResults.simulatedCumGwa;
        if (!cumGwa) return [];

        const hasFailingGrade = Object.values(simulatedGrades).some((g) => parseFloat(g) >= 5.0)
            || academic.failing_count > 0;

        const uniqueTrajectories = trajectory.filter(function(item, idx, arr) {
            return arr.findIndex(function(t) { return t.code === item.code; }) === idx;
        });

        return uniqueTrajectories.map(function(item) {
            const isQualified = !hasFailingGrade && cumGwa <= item.target_gwa;
            const isBlocked = item.category === 'Honor' && hasFailingGrade;

            return {
                ...item,
                is_currently_qualified: isQualified,
                is_blocked_by_failing: isBlocked
            };
        });
    }, [simulationResults, simulatedGrades, academic, trajectory]);

    const highestQualifiedHonor = useMemo(function() {
        const qualified = honorTrajectoryEval.filter((h) => h.is_currently_qualified);
        if (qualified.length === 0) return null;

        // Sort by lowest target_gwa (strictest honor)
        return qualified.sort((a, b) => a.target_gwa - b.target_gwa)[0];
    }, [honorTrajectoryEval]);

    return (
        <div className="border border-(--mui-palette-divider) flex flex-col gap-5 p-5 rounded-xl bg-white shadow-xs">
            <div className="flex flex-wrap gap-3 items-center justify-between">
                <div className="flex gap-2.5 items-center">
                    <div className="bg-(--mui-tokens-color-brand-100) p-2 rounded-lg text-(--mui-tokens-color-brand-900)">
                        <CalculatorIcon size={22} weight="bold" />
                    </div>
                    <div className="flex flex-col">
                        <h2 className="font-semibold text-(--mui-palette-text-primary) text-base md:text-lg">
                            &quot;What-If&quot; Grade &amp; Honors Simulator
                        </h2>
                        <p className="text-(--mui-palette-text-secondary) text-xs md:text-sm">
                            Test potential scores on upcoming finals to see if your target honor remains on track.
                        </p>
                    </div>
                </div>

                {isSimulating && (
                    <CommonButton
                        color="inherit"
                        size="small"
                        startIcon={<ArrowCounterClockwiseIcon size={14} weight="bold" />}
                        variant="outlined"
                        onClick={handleReset}
                    >
                        Reset to Actual
                    </CommonButton>
                )}
            </div>

            {/* Simulated GWA Metrics Cards */}
            <div className="gap-3 grid grid-cols-1 sm:grid-cols-3">
                <div className="bg-(--mui-tokens-color-brand-50) border border-(--mui-tokens-color-brand-100) flex flex-col gap-1 p-3.5 rounded-lg">
                    <span className="text-(--mui-tokens-color-neutral-600) text-xs uppercase font-medium">
                        Simulated Cum. GWA
                    </span>
                    <div className="flex gap-2 items-baseline">
                        <span className="font-bold text-(--mui-tokens-color-brand-950) text-2xl">
                            {formatGwa(simulationResults.simulatedCumGwa)}
                        </span>
                        {isSimulating && simulationResults.delta !== 0 && (
                            <span
                                className={`text-xs font-semibold ${
                                    simulationResults.delta < 0
                                        ? 'text-(--mui-palette-success-main)'
                                        : 'text-(--mui-palette-error-main)'
                                }`}
                            >
                                ({simulationResults.delta < 0 ? '' : '+'}{simulationResults.delta.toFixed(2)})
                            </span>
                        )}
                    </div>
                    <span className="text-(--mui-tokens-color-neutral-600) text-xs">
                        Actual GWA: {formatGwa(academic.cumulative_gwa)}
                    </span>
                </div>

                <div className="bg-(--mui-tokens-color-brand-50) border border-(--mui-tokens-color-brand-100) flex flex-col gap-1 p-3.5 rounded-lg">
                    <span className="text-(--mui-tokens-color-neutral-600) text-xs uppercase font-medium">
                        Simulated Term GWA
                    </span>
                    <span className="font-bold text-(--mui-tokens-color-brand-950) text-2xl">
                        {formatGwa(simulationResults.simulatedTermGwa)}
                    </span>
                    <span className="text-(--mui-tokens-color-neutral-600) text-xs">
                        Across {courses.length} enrolled subject{courses.length === 1 ? '' : 's'}
                    </span>
                </div>

                <div className="bg-(--mui-tokens-color-brand-50) border border-(--mui-tokens-color-brand-100) flex flex-col gap-1 p-3.5 rounded-lg justify-center">
                    <span className="text-(--mui-tokens-color-neutral-600) text-xs uppercase font-medium">
                        Projected Trajectory
                    </span>
                    <div className="flex gap-2 items-center">
                        <TrophyIcon className="text-(--mui-palette-warning-main)" size={20} weight="fill" />
                        <span className="font-semibold text-(--mui-tokens-color-brand-950) text-base truncate">
                            {highestQualifiedHonor ? highestQualifiedHonor.label : 'Dean’s List Candidate'}
                        </span>
                    </div>
                </div>
            </div>

            {/* Dynamic Honor Radar Trajectory Preview */}
            <div className="flex flex-col gap-2.5">
                <span className="font-medium text-(--mui-palette-text-primary) text-sm">
                    Simulated Honor Qualification Radar
                </span>
                <div className="gap-2.5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
                    {honorTrajectoryEval.map(function(item) {
                        const isQual = item.is_currently_qualified;
                        return (
                            <div
                                key={item.code}
                                className={`border p-3 rounded-lg flex flex-col gap-1 transition-all ${
                                    isQual
                                        ? 'border-(--mui-palette-success-main) bg-(--mui-palette-success-light)/10'
                                        : item.is_blocked_by_failing
                                            ? 'border-(--mui-palette-error-main)/40 bg-(--mui-palette-error-light)/5'
                                            : 'border-(--mui-palette-divider) bg-white'
                                }`}
                            >
                                <div className="flex items-center justify-between gap-2">
                                    <span className="font-medium text-xs text-(--mui-palette-text-primary)">
                                        {item.label}
                                    </span>
                                    <CommonBadgeStatus
                                        label={isQual ? 'Qualified' : item.is_blocked_by_failing ? 'Blocked' : 'Target'}
                                        variant={isQual ? 'success' : item.is_blocked_by_failing ? 'error' : 'warning'}
                                    />
                                </div>
                                <span className="text-xs text-(--mui-palette-text-secondary)">
                                    Target GWA: ≤ {formatGwa(item.target_gwa)}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Course Grade Simulator Grid */}
            <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                    <span className="font-medium text-(--mui-palette-text-primary) text-sm">
                        Simulate Subject Grades
                    </span>
                    <span className="text-xs text-(--mui-palette-text-secondary)">
                        Select predicted transmuted grades for each subject
                    </span>
                </div>

                <div className="border border-(--mui-palette-divider) overflow-hidden rounded-lg">
                    <div className="overflow-x-auto">
                        <table className="text-sm w-full">
                            <thead>
                                <tr className="border-b border-(--mui-palette-divider) bg-(--mui-tokens-color-brand-50) text-(--mui-palette-text-secondary) text-xs uppercase">
                                    <th className="font-medium px-4 py-2.5 text-left">Code</th>
                                    <th className="font-medium px-4 py-2.5 text-left">Subject Title</th>
                                    <th className="font-medium px-4 py-2.5 text-right">Actual Released</th>
                                    <th className="font-medium px-4 py-2.5 text-left w-64">Simulated Target Grade</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-(--mui-palette-divider)">
                                {courses.map(function(course) {
                                    const currentVal = simulatedGrades[course.enrollment_id] || '1.25';

                                    return (
                                        <tr key={course.enrollment_id} className="hover:bg-slate-50/50">
                                            <td className="px-4 py-3 font-semibold text-(--mui-palette-text-primary) text-xs">
                                                {course.course_code}
                                            </td>
                                            <td className="px-4 py-3 text-(--mui-palette-text-primary) text-xs">
                                                {course.course_title}
                                            </td>
                                            <td className="px-4 py-3 text-right font-medium text-xs">
                                                {course.released_grade ? formatGwa(course.released_grade) : 'Pending'}
                                            </td>
                                            <td className="px-4 py-2">
                                                <CommonSelect
                                                    options={GRADE_OPTIONS}
                                                    size="small"
                                                    value={currentVal}
                                                    onChange={function(e) {
                                                        handleGradeChange(course.enrollment_id, e.target.value as string);
                                                    }}
                                                />
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Tactical Advice Box */}
            <div className="bg-(--mui-tokens-color-brand-50) border border-(--mui-tokens-color-brand-100) p-4 rounded-lg flex items-start gap-3">
                <SparkleIcon className="text-(--mui-tokens-color-brand-900) shrink-0 mt-0.5" size={20} weight="fill" />
                <div className="flex flex-col gap-1 text-xs text-(--mui-tokens-color-brand-950)">
                    <span className="font-semibold text-sm">Simulator Tactical Insight</span>
                    <p className="m-0 leading-relaxed">
                        {highestQualifiedHonor ? (
                            <>
                                Maintaining these simulated grades yields a Cumulative GWA of{' '}
                                <strong>{formatGwa(simulationResults.simulatedCumGwa)}</strong>, putting you on track to graduate with{' '}
                                <strong>{highestQualifiedHonor.label}</strong> honours!
                            </>
                        ) : (
                            <>
                                Aim for 1.25 or higher in remaining major subjects to elevate your Cumulative GWA to meet the 1.75 threshold for Dean’s List.
                            </>
                        )}
                    </p>
                </div>
            </div>
        </div>
    );
}
