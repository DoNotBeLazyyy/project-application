import CommonButton from '@components/button/CommonButton';
import ConfirmPromptModal from '@components/modal/ConfirmPromptModal';
import CommonTable from '@components/table/CommonTable';
import StudentGradeBreakdownModal from '@pages/faculty/sections/grading/StudentGradeBreakdownModal';
import {
    CalculatorIcon, ChartLineUpIcon, DownloadSimpleIcon, LockKeyIcon, PaperPlaneTiltIcon, WarningCircleIcon, XIcon
} from '@phosphor-icons/react';
import SpecialGradeFlagBanner from '@pages/faculty/sections/grading/SpecialGradeFlagBanner';
import { GradeCalculationFailure, GradeSheetRow, GradingComponent } from '@type/faculty.type';
import { SpecialGradeFlag } from '@type/grading-config.type';
import { MobileCardColDef } from '@type/table.type';
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

    const isSubmitted = gradeSheet.length > 0 && gradeSheet.some((r) =>
        r.status === 'Submitted' || r.status === 'Approved' || r.status === 'Released');
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

    const columnDefs = useMemo<MobileCardColDef[]>(function() {
        return [
            {
                field: 'student_number',
                flex: 1,
                headerName: 'Student No.',
                mobileCard: 'subtitle',
                sortable: false
            },
            {
                field: 'full_name',
                flex: 2,
                headerName: 'Full Name',
                mobileCard: 'title',
                sortable: false
            },
            {
                field: 'raw_grade',
                flex: 1,
                headerName: 'Raw Grade',
                sortable: false,
                valueFormatter: (params) => params.value != null
                    ? `${params.value}%`
                    : '—'
            },
            {
                field: 'transmuted_grade',
                flex: 1,
                headerName: 'Transmuted',
                sortable: false,
                valueFormatter: (params) => params.value != null
                    ? String(params.value)
                    : '—'
            },
            {
                field: 'special_grade',
                flex: 1,
                headerName: 'Special',
                sortable: false,
                valueFormatter: (params) => params.value ?? '—'
            },
            {
                field: 'status',
                flex: 1,
                headerName: 'Status',
                sortable: false,
                valueFormatter: (params) => params.value ?? '—'
            },
            {
                cellRenderer: (params: { data: GradeSheetRow }) => (
                    <button
                        className="cursor-pointer flex font-medium gap-1 items-center text-(--mui-palette-primary-main) text-xs hover:underline"
                        type="button"
                        onClick={function() {
                            setAuditEnrollmentId(params.data.enrollment_id);
                        }}
                    >
                        <ChartLineUpIcon size={14} /> Audit Math
                    </button>
                ),
                field: 'audit',
                flex: 1,
                headerName: 'Audit',
                sortable: false
            }
        ];
    }, []);

    return (
        <div className="flex flex-col flex-1 gap-3 min-w-0">
            <div className="flex items-center justify-between">
                <div className="flex flex-col">
                    <span className="font-medium text-(--mui-palette-text-primary) text-sm">
                        Grade Sheet
                    </span>
                    {components.length === 0
                        ? (
                            <span className="text-(--mui-palette-warning-main) text-xs">
                                Add at least one grading component before grades can be calculated.
                            </span>
                        )
                        : null}
                </div>
                <div className="flex gap-2 items-center">
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
                        Calculate Grades
                    </CommonButton>
                    {onSubmitGrades && (
                        <CommonButton
                            disabled={gradeSheet.length === 0 || isSubmitted || isSubmittingGrades}
                            size="small"
                            startIcon={<PaperPlaneTiltIcon size={14} weight="bold" />}
                            variant="contained"
                            onClick={() => setIsConfirmOpen(true)}
                        >
                            {isSubmitted
                                ? 'Submitted to Registrar'
                                : 'Submit Grades'}
                        </CommonButton>
                    )}
                </div>
            </div>
            {isSubmitted && (
                <div className="bg-(--mui-palette-success-main)/10 border border-(--mui-palette-success-main) flex gap-2 items-center p-3 rounded-lg text-(--mui-palette-success-main)">
                    <LockKeyIcon size={18} weight="fill" />
                    <span className="font-medium text-sm">
                        Grades for {periodName ?? 'this period'} have been officially submitted to the Registrar and are locked for review.
                    </span>
                </div>
            )}
            {calculationFailures && calculationFailures.length > 0 && (
                <div className="bg-(--mui-palette-error-main)/10 border border-(--mui-palette-error-main) flex flex-col gap-2 max-h-40 overflow-y-auto p-3 rounded-lg">
                    <div className="flex gap-2 items-center text-(--mui-palette-error-main)">
                        <WarningCircleIcon size={16} weight="fill" />
                        <p className="font-semibold text-sm">
                            {calculationFailures.length} student(s) could not be calculated
                        </p>
                        {onDismissFailures && (
                            <button
                                className="cursor-pointer ml-auto shrink-0"
                                title="Dismiss"
                                type="button"
                                onClick={onDismissFailures}
                            >
                                <XIcon size={14} weight="bold" />
                            </button>
                        )}
                    </div>
                    <ul className="flex flex-col gap-1">
                        {calculationFailures.map(function(failure) {
                            return (
                                <li
                                    className="text-(--mui-palette-text-secondary) text-xs"
                                    key={failure.enrollment_id}
                                >
                                    <span className="font-medium text-(--mui-palette-text-primary)">
                                        {failure.full_name ?? failure.student_number ?? failure.enrollment_id}
                                    </span>
                                    {' — '}
                                    {failure.reason ?? 'No reason was returned.'}
                                </li>
                            );
                        })}
                    </ul>
                </div>
            )}
            {specialGradeFlags && onApplyFlag && onDismissFlag
                ? (
                    <SpecialGradeFlagBanner
                        flags={specialGradeFlags}
                        isBusy={isFlagBusy}
                        onApply={onApplyFlag}
                        onDismiss={onDismissFlag}
                    />
                )
                : null}
            <div className="flex-1 min-h-0">
                <CommonTable<GradeSheetRow>
                    leadingColumnDefs={columnDefs}
                    rowData={gradeSheet}
                />
            </div>
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
            {auditEnrollmentId && gradingPeriodId && (
                <StudentGradeBreakdownModal
                    enrollmentId={auditEnrollmentId}
                    gradingPeriodId={gradingPeriodId}
                    open={Boolean(auditEnrollmentId && gradingPeriodId)}
                    onClose={function() {
                        setAuditEnrollmentId(null);
                    }}
                />
            )}
        </div>
    );
}