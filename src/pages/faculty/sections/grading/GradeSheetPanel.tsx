import CommonButton from '@components/button/CommonButton';
import CommonTable from '@components/table/CommonTable';
import { CalculatorIcon, WarningCircleIcon, XIcon } from '@phosphor-icons/react';
import SpecialGradeFlagBanner from '@pages/faculty/sections/grading/SpecialGradeFlagBanner';
import { GradeCalculationFailure, GradeSheetRow, GradingComponent } from '@type/faculty.type';
import { SpecialGradeFlag } from '@type/grading-config.type';
import { MobileCardColDef } from '@type/table.type';
import { useMemo } from 'react';

interface GradeSheetPanelProps {
    components: GradingComponent[];
    gradeSheet: GradeSheetRow[];
    calculationFailures?: GradeCalculationFailure[];
    specialGradeFlags?: SpecialGradeFlag[];
    isFlagBusy?: boolean;
    onCalculate: () => Promise<void>;
    onDismissFailures?: () => void;
    onApplyFlag?: (flag: SpecialGradeFlag) => void;
    onDismissFlag?: (flag: SpecialGradeFlag) => void;
}

export default function GradeSheetPanel({
    components,
    gradeSheet,
    calculationFailures,
    specialGradeFlags,
    isFlagBusy,
    onCalculate,
    onDismissFailures,
    onApplyFlag,
    onDismissFlag
}: GradeSheetPanelProps) {
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
                <CommonButton
                    disabled={components.length === 0}
                    size="small"
                    startIcon={<CalculatorIcon size={14} weight="bold" />}
                    variant="outlined"
                    onClick={onCalculate}
                >
                    Calculate Grades
                </CommonButton>
            </div>
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
        </div>
    );
}