import { CommonBadgeStatus } from '@components/badge/CommonBadgeStatus';
import GradeBreakdownModal from '@pages/faculty/sections/student-detail/GradeBreakdownModal';
import { formatScore, gradeStatusVariant } from '@pages/faculty/sections/student-detail/studentDetailFormat';
import { StudentEvaluationGrade } from '@type/faculty.type';
import { useState } from 'react';

interface StudentGradeTabProps {
    enrollmentId: string;
    grades: StudentEvaluationGrade[];
}

export default function StudentGradeTab({ enrollmentId, grades }: StudentGradeTabProps) {
    const [selectedPeriodId, setSelectedPeriodId] = useState<string | null>(null);

    return (
        <div className="flex flex-1 flex-col gap-3 min-h-0">
            <p className="text-slate-500 text-xs">
                Select a grading period card to view its component math breakdown.
            </p>

            <div className="flex-1 min-h-0 overflow-y-auto">
                {grades.length === 0 ? (
                    <div className="py-12 text-center text-slate-500 text-xs">
                        No period grades calculated for this student yet.
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-4">
                        {grades.map((grade) => {
                            const transmuted =
                                grade.special_grade ??
                                (grade.transmuted_grade !== null && grade.transmuted_grade !== undefined
                                    ? String(grade.transmuted_grade)
                                    : '—');

                            return (
                                <div
                                    key={grade.grading_period_id}
                                    onClick={() => setSelectedPeriodId(grade.grading_period_id)}
                                    className="bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 rounded-2xl p-4 shadow-2xs hover:shadow-xs hover:border-blue-400 dark:hover:border-blue-600 transition-all cursor-pointer flex flex-col justify-between gap-3"
                                >
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <span className="font-bold text-slate-900 dark:text-slate-100 text-sm truncate">
                                                {grade.grading_period_name}
                                            </span>
                                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-slate-300">
                                                Weight {grade.weight}%
                                            </span>
                                        </div>

                                        {grade.status ? (
                                            <CommonBadgeStatus
                                                label={grade.status}
                                                variant={gradeStatusVariant(grade.status)}
                                            />
                                        ) : (
                                            <span className="text-xs text-slate-400">—</span>
                                        )}
                                    </div>

                                    {/* Metrics */}
                                    <div className="grid grid-cols-3 gap-2">
                                        <div className="bg-slate-50/90 dark:bg-zinc-800/50 border border-slate-100 dark:border-zinc-800/80 p-2 rounded-xl text-center">
                                            <span className="block font-medium text-[10px] text-slate-400 uppercase">
                                                Raw
                                            </span>
                                            <span className="font-bold text-xs text-slate-800 dark:text-slate-200 mt-0.5 block">
                                                {formatScore(grade.raw_grade)}
                                            </span>
                                        </div>

                                        <div className="bg-blue-50/60 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/60 p-2 rounded-xl text-center">
                                            <span className="block font-bold text-[10px] text-blue-600 dark:text-blue-400 uppercase">
                                                Transmuted
                                            </span>
                                            <span className="font-extrabold text-sm text-blue-700 dark:text-blue-300 mt-0.5 block">
                                                {transmuted}
                                            </span>
                                        </div>

                                        <div className="bg-slate-50/90 dark:bg-zinc-800/50 border border-slate-100 dark:border-zinc-800/80 p-2 rounded-xl text-center">
                                            <span className="block font-medium text-[10px] text-slate-400 uppercase">
                                                Final
                                            </span>
                                            <span className="font-bold text-xs text-slate-800 dark:text-slate-200 mt-0.5 block">
                                                {formatScore(grade.final_grade)}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            <GradeBreakdownModal
                enrollmentId={enrollmentId}
                gradingPeriodId={selectedPeriodId}
                onClose={() => setSelectedPeriodId(null)}
            />
        </div>
    );
}