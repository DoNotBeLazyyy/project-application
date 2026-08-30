import { CommonBadgeStatus } from '@components/badge/CommonBadgeStatus';
import CommonModal from '@components/modal/CommonModal';
import GradeComponentAccordion from '@pages/faculty/sections/student-detail/GradeComponentAccordion';
import { formatScore, gradeStatusVariant } from '@pages/faculty/sections/student-detail/studentDetailFormat';
import { XIcon } from '@phosphor-icons/react';
import { getStudentGradeBreakdown } from '@services/faculty.service';
import { StudentGradeBreakdown } from '@type/faculty.type';
import { useEffect, useState } from 'react';

interface GradeBreakdownModalProps {
    enrollmentId: string;
    gradingPeriodId: string | null;
    onClose: () => void;
}

interface SummaryFieldProps {
    label: string;
    value: string;
}

function SummaryField({ label, value }: SummaryFieldProps) {
    return (
        <div className="bg-(--mui-palette-action-hover) flex flex-col gap-1 p-3 rounded-lg">
            <span className="font-semibold text-(--mui-palette-text-primary) text-lg">
                {value}
            </span>
            <span className="text-(--mui-palette-text-secondary) text-xs">
                {label}
            </span>
        </div>
    );
}

export default function GradeBreakdownModal({ enrollmentId, gradingPeriodId, onClose }: GradeBreakdownModalProps) {
    const [data, setData] = useState<StudentGradeBreakdown | null>(null);

    useEffect(function() {
        setData(null);

        if (!gradingPeriodId) {
            return;
        }

        async function fetchData(periodId: string) {
            const result = await getStudentGradeBreakdown(enrollmentId, periodId);

            if (result.data) {
                setData(result.data);
            }
        }

        fetchData(gradingPeriodId);
    }, [enrollmentId, gradingPeriodId]);

    const transmutedDisplay = data
        ? data.special_grade
            ?? (data.transmuted_grade !== null
                ? String(data.transmuted_grade)
                : '—')
        : '—';

    return (
        <CommonModal
            cardProps={{ className: 'flex flex-col gap-4 h-full sm:h-auto max-h-[100dvh] sm:max-h-[85dvh] overflow-y-auto w-full sm:w-[min(94vw,640px)]' }}
            open={Boolean(gradingPeriodId)}
            onClose={onClose}
        >
            <div className="flex items-start justify-between">
                <div className="flex flex-col gap-1">
                    <span className="text-(--mui-palette-text-secondary) text-xs uppercase">
                        Grade Breakdown
                    </span>
                    <div className="flex flex-wrap gap-2 items-center">
                        <h2 className="font-semibold text-(--mui-palette-text-primary) text-lg">
                            {data?.grading_period_name ?? 'Loading…'}
                        </h2>
                        {data?.status && (
                            <CommonBadgeStatus
                                label={data.status}
                                variant={gradeStatusVariant(data.status)}
                            />
                        )}
                    </div>
                </div>
                <button
                    className="hover:bg-(--mui-palette-action-hover) p-1 rounded text-(--mui-palette-text-secondary) transition-colors"
                    title="Close"
                    onClick={onClose}
                >
                    <XIcon size={18} weight="bold" />
                </button>
            </div>

            {!data && (
                <p className="py-8 text-(--mui-palette-text-secondary) text-center text-sm">
                    Loading grade breakdown…
                </p>
            )}

            {data && (
                <>
                    <div className="gap-3 grid grid-cols-2 sm:grid-cols-4">
                        <SummaryField label="Raw Grade" value={formatScore(data.raw_grade)} />
                        <SummaryField label="Final Grade" value={formatScore(data.final_grade)} />
                        <SummaryField label="Transmuted" value={transmutedDisplay} />
                        <SummaryField label="Period Weight" value={`${data.weight}%`} />
                    </div>
                    <div className="flex flex-col gap-2">
                        <div className="flex items-baseline justify-between">
                            <span className="font-medium text-(--mui-palette-text-primary) text-sm">
                                Components
                            </span>
                            <span className="text-(--mui-palette-text-secondary) text-xs">
                                Expand a component to see each assessment
                            </span>
                        </div>
                        {data.components.length === 0
                            ? (
                                <p className="italic py-4 text-(--mui-palette-text-secondary) text-sm">
                                    No grading components configured for this period.
                                </p>
                            )
                            : (
                                <div className="flex flex-col gap-2">
                                    {data.components.map(function(component) {
                                        return (
                                            <GradeComponentAccordion
                                                component={component}
                                                defaultExpanded={data.components.length === 1}
                                                key={component.id}
                                            />
                                        );
                                    })}
                                </div>
                            )
                        }
                    </div>
                </>
            )}
        </CommonModal>
    );
}