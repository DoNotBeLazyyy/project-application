import CommonButton from '@components/button/CommonButton';
import CommonSelect from '@components/select/CommonSelect';
import CommonTable from '@components/table/CommonTable';
import { CheckCircleIcon, ClockIcon } from '@phosphor-icons/react';
import { approveAndReleaseGrades, listGradeRelease } from '@services/grade-release.service';
import { getTerms, TermOption } from '@services/section.service';
import { ChangeEventInputTextarea } from '@type/common.type';
import { GradeReleaseListRow, GradingPeriodStat } from '@type/grade-release.type';
import { ColDef } from 'ag-grid-community';
import { useEffect, useMemo, useState } from 'react';

export default function GradeRelease() {
    const [termOptions, setTermOptions] = useState<{ label: string; value: string }[]>([]);
    const [selectedTermId, setSelectedTermId] = useState<string>('');
    const [rows, setRows] = useState<GradeReleaseListRow[]>([]);

    useEffect(function() {
        async function fetchTerms() {
            const result = await getTerms();

            if (result.data) {
                const options = result.data.map((term: TermOption) => ({
                    label: term.label,
                    value: term.id
                }));
                setTermOptions(options);

                if (options.length > 0) {
                    setSelectedTermId(options[0].value);
                }
            }
        }

        fetchTerms();
    }, []);

    useEffect(function() {
        async function fetchRows() {
            if (!selectedTermId) return;

            const result = await listGradeRelease(1, 200, '', [], selectedTermId);

            if (result.data) {
                setRows(result.data.content);
            }
        }

        fetchRows();
    }, [selectedTermId]);

    async function handleRelease(sectionId: string, gradingPeriodId: string) {
        const result = await approveAndReleaseGrades(sectionId, gradingPeriodId);

        if (!result.error) {
            const refreshed = await listGradeRelease(1, 200, '', [], selectedTermId);

            if (refreshed.data) {
                setRows(refreshed.data.content);
            }
        }
    }

    function handleTermChange(e: ChangeEventInputTextarea) {
        setSelectedTermId(e.target.value);
    }

    const columnDefs = useMemo<ColDef<GradeReleaseListRow>[]>(function() {
        return [
            {
                field: 'section_code',
                flex: 1,
                headerName: 'Section',
                sortable: true
            },
            {
                field: 'course_code',
                flex: 1,
                headerName: 'Course Code',
                sortable: true
            },
            {
                field: 'course_title',
                flex: 3,
                headerName: 'Course Title',
                sortable: true
            },
            {
                field: 'faculty_name',
                flex: 2,
                headerName: 'Faculty',
                sortable: true,
                valueFormatter: (params) => params.value || '—'
            },
            {
                field: 'grading_periods',
                flex: 4,
                headerName: 'Grading Periods',
                sortable: false,
                autoHeight: true,
                cellRenderer: (params: { data: GradeReleaseListRow }) => {
                    const periods = params.data.grading_periods;

                    if (!periods || periods.length === 0) {
                        return (
                            <div className="flex h-full items-center">
                                <span className="text-[var(--mui-palette-text-disabled)] text-xs">
                                    No grading periods
                                </span>
                            </div>
                        );
                    }

                    return (
                        <div className="flex flex-wrap gap-2 py-2">
                            {periods.map((period: GradingPeriodStat) => {
                                const isFullyReleased = period.released_count === period.total_grades
                                    && period.total_grades > 0;
                                const hasGrades = period.total_grades > 0;

                                return (
                                    <div
                                        className="border border-[var(--mui-palette-divider)] flex flex-col gap-1 min-w-36 px-3 py-2 rounded-lg"
                                        key={period.grading_period_id}
                                    >
                                        <span className="font-medium text-[var(--mui-palette-text-primary)] text-xs">
                                            {period.grading_period_name}
                                        </span>
                                        <span className="text-[var(--mui-palette-text-secondary)] text-xs">
                                            {period.released_count}/{period.total_grades} released
                                        </span>
                                        {isFullyReleased
                                            ? (
                                                <div className="flex gap-1 items-center text-[var(--mui-palette-success-main)]">
                                                    <CheckCircleIcon size={12} weight="bold" />
                                                    <span className="text-xs">Released</span>
                                                </div>
                                            )
                                            : (
                                                <CommonButton
                                                    disabled={!hasGrades}
                                                    size="small"
                                                    startIcon={<ClockIcon size={12} weight="bold" />}
                                                    sx={{ fontSize: '0.7rem', minWidth: 0, px: 1, py: 0.25 }}
                                                    variant="contained"
                                                    onClick={function() {
                                                        handleRelease(
                                                            params.data.id,
                                                            period.grading_period_id
                                                        );
                                                    }}
                                                >
                                                    Release
                                                </CommonButton>
                                            )
                                        }
                                    </div>
                                );
                            })}
                        </div>
                    );
                }
            }
        ];
    }, [selectedTermId]);

    return (
        <div className="flex flex-col gap-4 h-full">
            <div className="flex flex-col gap-1">
                <h1 className="font-semibold text-[var(--mui-palette-text-primary)] text-xl">
                    Grade Release
                </h1>
                <p className="text-[var(--mui-palette-text-secondary)] text-sm">
                    Approve and release grades per section and grading period.
                </p>
            </div>
            <div className="flex gap-3 items-center">
                <span className="font-medium text-[var(--mui-palette-text-primary)] text-sm whitespace-nowrap">
                    Select Term
                </span>
                <div className="w-80">
                    <CommonSelect
                        fullWidth
                        options={termOptions}
                        size="small"
                        value={selectedTermId}
                        onChange={handleTermChange}
                    />
                </div>
            </div>
            <div className="flex-1 min-h-0">
                <CommonTable<GradeReleaseListRow>
                    leadingColumnDefs={columnDefs}
                    rowData={rows}
                />
            </div>
        </div>
    );
}