import CommonButton from '@components/button/CommonButton';
import ConfirmPromptModal from '@components/modal/ConfirmPromptModal';
import StudentGradeBreakdownModal from '@pages/faculty/sections/grading/StudentGradeBreakdownModal';
import {
    CalculatorIcon,
    ChartLineUpIcon,
    DownloadSimpleIcon,
    LockKeyIcon,
    MagnifyingGlassIcon,
    PaperPlaneTiltIcon,
    UserCircleIcon,
    WarningCircleIcon,
    XIcon
} from '@phosphor-icons/react';
import SpecialGradeFlagBanner from '@pages/faculty/sections/grading/SpecialGradeFlagBanner';
import { GradeCalculationFailure, GradeSheetRow, GradingComponent } from '@type/faculty.type';
import { SpecialGradeFlag } from '@type/grading-config.type';
import { exportCsvFile } from '@utils/file.util';
import { generateGradeSheetCsv } from '@utils/grading.util';
import { useMemo, useState } from 'react';

interface GradeSheetPanelProps {
    components: GradingComponent[];
    gradeSheet: GradeSheetRow[];
    calculationFailures?: GradeCalculationFailure[];
    courseCode?: string;
    courseTitle?: string;
    gradingPeriodId?: string;
    isFlagBusy?: boolean;
    isSubmittingGrades?: boolean;
    periodName?: string;
    sectionCode?: string;
    specialGradeFlags?: SpecialGradeFlag[];
    onApplyFlag?: (flag: SpecialGradeFlag) => void;
    onCalculate: () => Promise<void>;
    onDismissFailures?: () => void;
    onDismissFlag?: (flag: SpecialGradeFlag) => void;
    onSubmitGrades?: () => Promise<void>;
}

export default function GradeSheetPanel({
    components,
    gradeSheet,
    calculationFailures,
    courseCode,
    courseTitle,
    gradingPeriodId,
    isFlagBusy,
    isSubmittingGrades,
    periodName,
    sectionCode,
    specialGradeFlags,
    onApplyFlag,
    onCalculate,
    onDismissFailures,
    onDismissFlag,
    onSubmitGrades
}: GradeSheetPanelProps) {
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [auditEnrollmentId, setAuditEnrollmentId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    const isSubmitted =
        gradeSheet.length > 0 &&
        gradeSheet.some(
            (r) => r.status === 'Submitted' || r.status === 'Approved' || r.status === 'Released'
        );

    function handleExportCsv() {
        if (gradeSheet.length === 0) return;

        const csvContent = generateGradeSheetCsv({
            courseCode,
            courseTitle,
            gradeSheet,
            periodName,
            sectionCode
        });

        const parts = ['GradeSheet', courseCode, sectionCode, periodName].filter(Boolean);
        const filename = `${parts.join('_')}.csv`;
        exportCsvFile(filename, csvContent);
    }

    const filteredRows = useMemo(() => {
        if (!searchQuery.trim()) return gradeSheet;
        const q = searchQuery.toLowerCase();
        return gradeSheet.filter((row) => {
            const name = (row.full_name ?? '').toLowerCase();
            const studentNo = (row.student_number ?? '').toLowerCase();
            return name.includes(q) || studentNo.includes(q);
        });
    }, [gradeSheet, searchQuery]);

    return (
        <div className="flex flex-col flex-1 gap-3.5 min-w-0 h-full">
            {/* Header Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-zinc-900 p-3 sm:p-4 rounded-2xl border border-slate-200/90 dark:border-zinc-800 shadow-2xs">
                <div className="flex flex-col min-w-0">
                    <span className="font-bold text-slate-900 dark:text-slate-100 text-sm sm:text-base">
                        Official Grade Sheet ({gradeSheet.length} students)
                    </span>
                    {components.length === 0 ? (
                        <span className="text-amber-600 dark:text-amber-400 text-xs mt-0.5">
                            Add at least one grading component before grades can be computed.
                        </span>
                    ) : (
                        <span className="text-xs text-slate-500 mt-0.5">
                            Grading period: <strong>{periodName ?? 'Active Period'}</strong>
                        </span>
                    )}
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <CommonButton
                        disabled={gradeSheet.length === 0}
                        size="small"
                        startIcon={<DownloadSimpleIcon size={14} weight="bold" />}
                        variant="outlined"
                        onClick={handleExportCsv}
                    >
                        Export CSV
                    </CommonButton>

                    <CommonButton
                        disabled={components.length === 0 || isSubmitted}
                        size="small"
                        startIcon={<CalculatorIcon size={14} weight="bold" />}
                        variant="outlined"
                        onClick={onCalculate}
                    >
                        Calculate
                    </CommonButton>

                    {onSubmitGrades && (
                        <CommonButton
                            disabled={gradeSheet.length === 0 || isSubmitted || isSubmittingGrades}
                            size="small"
                            startIcon={<PaperPlaneTiltIcon size={14} weight="bold" />}
                            variant="contained"
                            onClick={() => setIsConfirmOpen(true)}
                        >
                            {isSubmitted ? 'Submitted' : 'Submit to Registrar'}
                        </CommonButton>
                    )}
                </div>
            </div>

            {/* Submission Status Banner */}
            {isSubmitted && (
                <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex gap-2.5 items-center p-3 rounded-2xl text-emerald-800 dark:text-emerald-300">
                    <LockKeyIcon size={20} weight="fill" className="shrink-0 text-emerald-600" />
                    <span className="font-medium text-xs sm:text-sm">
                        Grades for {periodName ?? 'this period'} have been officially submitted to the Registrar and are locked for review.
                    </span>
                </div>
            )}

            {/* Calculation Failures Banner */}
            {calculationFailures && calculationFailures.length > 0 && (
                <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 flex flex-col gap-2 max-h-40 overflow-y-auto p-3.5 rounded-2xl">
                    <div className="flex gap-2 items-center text-rose-700 dark:text-rose-300">
                        <WarningCircleIcon size={18} weight="fill" />
                        <p className="font-bold text-xs sm:text-sm">
                            {calculationFailures.length} student grade(s) could not be calculated
                        </p>
                        {onDismissFailures && (
                            <button
                                className="cursor-pointer ml-auto shrink-0 p-1 text-rose-500 hover:text-rose-700"
                                title="Dismiss"
                                type="button"
                                onClick={onDismissFailures}
                            >
                                <XIcon size={14} weight="bold" />
                            </button>
                        )}
                    </div>
                    <ul className="flex flex-col gap-1">
                        {calculationFailures.map((failure) => (
                            <li className="text-xs text-rose-600 dark:text-rose-400" key={failure.enrollment_id}>
                                <strong>{failure.full_name ?? failure.student_number ?? failure.enrollment_id}</strong>: {failure.reason ?? 'Calculation issue.'}
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Special Grade Flags Banner */}
            {specialGradeFlags && onApplyFlag && onDismissFlag && (
                <SpecialGradeFlagBanner
                    flags={specialGradeFlags}
                    isBusy={isFlagBusy}
                    onApply={onApplyFlag}
                    onDismiss={onDismissFlag}
                />
            )}

            {/* Quick Student Search */}
            <div className="relative">
                <MagnifyingGlassIcon
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                    size={16}
                />
                <input
                    type="text"
                    placeholder="Search student by name or student number in grade sheet..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                />
            </div>

            {/* Bento Cards Grid for Grade Sheet */}
            <div className="flex-1 min-h-0 overflow-y-auto">
                {filteredRows.length === 0 ? (
                    <div className="py-12 text-center text-slate-500 text-xs border border-dashed border-slate-200 dark:border-zinc-800 rounded-2xl bg-white dark:bg-zinc-900">
                        {gradeSheet.length === 0
                            ? 'No grade records generated for this period yet. Click "Calculate" to compute.'
                            : `No students match "${searchQuery}".`}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pb-6">
                        {filteredRows.map((row) => (
                            <div
                                key={row.enrollment_id}
                                className="bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 rounded-2xl p-3.5 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between gap-3"
                            >
                                <div>
                                    {/* Student Header */}
                                    <div className="flex items-center justify-between gap-2 mb-2">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-slate-300 font-bold text-xs flex items-center justify-center shrink-0">
                                                {row.full_name
                                                    ?.split(' ')
                                                    .map((n) => n[0])
                                                    .slice(0, 2)
                                                    .join('') || <UserCircleIcon size={18} />}
                                            </div>
                                            <div className="flex flex-col min-w-0">
                                                <span className="font-bold text-slate-900 dark:text-slate-100 text-sm truncate leading-snug">
                                                    {row.full_name}
                                                </span>
                                                <span className="text-[11px] font-mono text-slate-400">
                                                    {row.student_number}
                                                </span>
                                            </div>
                                        </div>

                                        <span
                                            className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border shrink-0 ${
                                                row.status === 'Submitted' || row.status === 'Approved'
                                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300'
                                                    : 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-zinc-800 dark:text-slate-300'
                                            }`}
                                        >
                                            {row.status ?? 'Draft'}
                                        </span>
                                    </div>

                                    {/* Metrics Grid */}
                                    <div className="grid grid-cols-3 gap-1.5 mt-2.5">
                                        <div className="bg-slate-50/90 dark:bg-zinc-800/50 border border-slate-100 dark:border-zinc-800/80 p-2 rounded-xl text-center">
                                            <span className="block font-medium text-[10px] text-slate-400 uppercase tracking-tight">
                                                Raw
                                            </span>
                                            <span className="font-bold text-xs text-slate-800 dark:text-slate-200 block mt-0.5">
                                                {row.raw_grade != null ? `${row.raw_grade}%` : '—'}
                                            </span>
                                        </div>

                                        <div className="bg-blue-50/60 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/60 p-2 rounded-xl text-center">
                                            <span className="block font-bold text-[10px] text-blue-600 dark:text-blue-400 uppercase tracking-tight">
                                                Transmuted
                                            </span>
                                            <span className="font-extrabold text-sm text-blue-700 dark:text-blue-300 block mt-0.5">
                                                {row.transmuted_grade != null ? String(row.transmuted_grade) : '—'}
                                            </span>
                                        </div>

                                        <div className="bg-slate-50/90 dark:bg-zinc-800/50 border border-slate-100 dark:border-zinc-800/80 p-2 rounded-xl text-center">
                                            <span className="block font-medium text-[10px] text-slate-400 uppercase tracking-tight">
                                                Special
                                            </span>
                                            <span className="font-bold text-xs text-slate-700 dark:text-slate-300 block mt-0.5">
                                                {row.special_grade || '—'}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Audit Math Button */}
                                <div className="border-t border-slate-100 dark:border-zinc-800 pt-2 flex items-center justify-end">
                                    <button
                                        type="button"
                                        onClick={() => setAuditEnrollmentId(row.enrollment_id)}
                                        className="cursor-pointer flex font-semibold gap-1.5 items-center text-blue-600 dark:text-blue-400 hover:text-blue-700 text-xs px-2.5 py-1 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950/50 transition-colors"
                                    >
                                        <ChartLineUpIcon size={14} weight="bold" />
                                        Audit Breakdown
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Confirm Submit Grades Modal */}
            <ConfirmPromptModal
                formButtonsProps={{
                    cancelProps: {
                        children: 'Cancel',
                        onClick: () => setIsConfirmOpen(false)
                    },
                    confirmProps: {
                        children: 'Officially Submit Grades',
                        onClick: function() {
                            setIsConfirmOpen(false);
                            if (onSubmitGrades) {
                                onSubmitGrades();
                            }
                        }
                    }
                }}
                mainContent={{
                    title: 'Submit Grades to Registrar?'
                }}
                open={isConfirmOpen}
                subContent={{
                    title: `Are you sure you want to submit official grades for ${periodName ?? 'this grading period'} ${sectionCode ?? ''} to the Registrar? Once submitted, the grade sheet will be locked for review.`
                }}
                onClose={() => setIsConfirmOpen(false)}
            />

            {/* Student Grade Breakdown Modal */}
            {auditEnrollmentId && gradingPeriodId && (
                <StudentGradeBreakdownModal
                    enrollmentId={auditEnrollmentId}
                    gradingPeriodId={gradingPeriodId}
                    open={Boolean(auditEnrollmentId && gradingPeriodId)}
                    onClose={() => setAuditEnrollmentId(null)}
                />
            )}
        </div>
    );
}