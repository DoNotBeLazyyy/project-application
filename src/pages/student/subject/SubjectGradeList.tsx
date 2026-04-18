import CommonButton from '@components/button/CommonButton';
import { LockIcon, LockOpenIcon } from '@phosphor-icons/react';
import { SubjectGradeItem } from '@type/student-portal.type';

interface SubjectGradeListProps {
    grades: SubjectGradeItem[];
}

export default function SubjectGradeList({ grades }: SubjectGradeListProps) {
    if (!grades.length) {
        return (
            <div className="flex flex-col gap-3">
                <span className="font-medium text-(--mui-palette-text-primary) text-sm">
                    Grades
                </span>
                <p className="text-(--mui-palette-text-secondary) text-sm">
                    No grading periods available.
                </p>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-3">
            <span className="font-medium text-(--mui-palette-text-primary) text-sm">
                Grades
            </span>
            <div className="flex flex-col gap-2">
                {grades.map((grade) => {
                    const isVisible = grade.is_visible && grade.evaluation_completed;
                    const needsEvaluation = grade.is_visible && !grade.evaluation_completed;

                    return (
                        <div
                            className="border border-(--mui-palette-divider) flex gap-4 items-center justify-between p-3 rounded-lg"
                            key={grade.grading_period_id}
                        >
                            <span className="font-medium text-(--mui-palette-text-primary) text-sm">
                                {grade.grading_period_name}
                            </span>
                            {isVisible && (
                                <div className="flex gap-6 items-center">
                                    <div className="flex flex-col items-center">
                                        <span className="text-(--mui-palette-text-secondary) text-xs">
                                            Raw
                                        </span>
                                        <span className="font-semibold text-(--mui-palette-text-primary) text-sm">
                                            {grade.raw_grade ?? '—'}
                                        </span>
                                    </div>
                                    <div className="flex flex-col items-center">
                                        <span className="text-(--mui-palette-text-secondary) text-xs">
                                            Final
                                        </span>
                                        <span className="font-semibold text-(--mui-palette-text-primary) text-sm">
                                            {grade.final_grade ?? '—'}
                                        </span>
                                    </div>
                                    <div className="flex flex-col items-center">
                                        <span className="text-(--mui-palette-text-secondary) text-xs">
                                            Transmuted
                                        </span>
                                        <span className="font-semibold text-(--mui-palette-text-primary) text-sm">
                                            {grade.transmuted_grade ?? grade.special_grade ?? '—'}
                                        </span>
                                    </div>
                                    <LockOpenIcon
                                        className="text-(--mui-palette-success-main)"
                                        size={16}
                                        weight="bold"
                                    />
                                </div>
                            )}
                            {needsEvaluation && (
                                <div className="flex gap-2 items-center">
                                    <span className="text-(--mui-palette-warning-main) text-xs">
                                        Complete evaluation to view grade
                                    </span>
                                    <CommonButton
                                        color="warning"
                                        size="small"
                                        variant="outlined"
                                        onClick={function() {
                                        }}
                                    >
                                        Evaluate
                                    </CommonButton>
                                </div>
                            )}
                            {!grade.is_visible && (
                                <div className="flex gap-2 items-center text-(--mui-palette-text-disabled)">
                                    <LockIcon size={14} weight="bold" />
                                    <span className="text-xs">
                                        Not yet released
                                    </span>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}