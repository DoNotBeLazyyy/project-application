import CommonButton from '@components/button/CommonButton';
import CommonCard from '@components/card/CommonCard';
import ConfirmPromptModal from '@components/modal/ConfirmPromptModal';
import { CommonSelectOption } from '@components/select/CommonSelect';
import CommonTable from '@components/table/CommonTable';
import { ArrowsClockwiseIcon, MagnifyingGlassIcon } from '@phosphor-icons/react';
import ProgressionCohortForm from '@pages/registrar/batch-progression/ProgressionCohortForm';
import ProgressionDetailModal from '@pages/registrar/batch-progression/ProgressionDetailModal';
import ProgressionResultModal from '@pages/registrar/batch-progression/ProgressionResultModal';
import { useProgressionColumns } from '@pages/registrar/batch-progression/useProgressionColumns';
import { getEnrollmentTargetTerm } from '@services/enrollment.service';
import { getPrograms } from '@services/program/program.service';
import { previewBatchProgression, runBatchProgression } from '@services/progression.service';
import { getTerms } from '@services/section.service';
import { ProgressionFormValues, ProgressionPreview, ProgressionPreviewRow, ProgressionRunResult } from '@type/progression.type';
import { formErrors } from '@utils/form.util';
import { useEffect, useState } from 'react';
import { FieldErrors, useForm } from 'react-hook-form';

const COHORT_FORM_ID = 'batch-progression-cohort-form';

const defaultFormValues: ProgressionFormValues = {
    term_id: '',
    program_ids: [],
    year_levels: [],
    reason: '',
    auto_enroll: true
};

interface SummaryTile {
    label: string;
    resolveValue: (preview: ProgressionPreview) => number;
}

const SUMMARY_TILES: SummaryTile[] = [
    { label: 'Students In Cohort', resolveValue: (preview) => preview.total_count },
    { label: 'To Be Promoted', resolveValue: (preview) => preview.promote_count },
    { label: 'Enrollments To Create', resolveValue: (preview) => preview.enrollable_count },
    { label: 'Skipped', resolveValue: (preview) => preview.blocked_count }
];

export default function BatchProgression() {
    const [termOptions, setTermOptions] = useState<CommonSelectOption[]>([]);
    const [programOptions, setProgramOptions] = useState<CommonSelectOption[]>([]);
    const [preview, setPreview] = useState<ProgressionPreview | null>(null);
    const [selectedRow, setSelectedRow] = useState<ProgressionPreviewRow | null>(null);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [runResult, setRunResult] = useState<ProgressionRunResult | null>(null);

    const columnDefs = useProgressionColumns();

    const cohortMethods = useForm<ProgressionFormValues>({
        defaultValues: defaultFormValues
    });

    useEffect(function() {
        async function fetchOptions() {
            const [terms, programs, targetTerm] = await Promise.all([
                getTerms(),
                getPrograms(),
                getEnrollmentTargetTerm()
            ]);

            if (terms.data) {
                setTermOptions(
                    terms.data.map((term) => ({
                        label: term.label,
                        value: term.id
                    }))
                );
            }

            if (programs.data) {
                setProgramOptions(
                    programs.data.map((program) => ({
                        label: program.label,
                        value: program.id
                    }))
                );
            }

            if (targetTerm.data) {
                cohortMethods.setValue('term_id', targetTerm.data.id);
            }
        }

        fetchOptions();
    }, [cohortMethods]);

    async function handlePreview(values: ProgressionFormValues) {
        const result = await previewBatchProgression(values.term_id, {
            program_ids: values.program_ids,
            year_levels: values.year_levels
        });

        setPreview(result.data);
    }

    function handlePreviewError(errors: FieldErrors<ProgressionFormValues>) {
        formErrors(errors, cohortMethods);
    }

    async function handleConfirmRun() {
        const values = cohortMethods.getValues();

        setIsConfirmOpen(false);

        const result = await runBatchProgression(
            values.term_id,
            {
                program_ids: values.program_ids,
                year_levels: values.year_levels
            },
            values.auto_enroll,
            values.reason
        );

        if (result.data) {
            setRunResult(result.data);
            await handlePreview(values);
        }
    }

    const hasWork = preview !== null && (preview.promote_count > 0 || preview.enrollable_count > 0);

    return (
        <div className="flex flex-col gap-4 h-full">
            <div className="flex flex-col gap-1">
                <h1 className="font-semibold text-(--mui-palette-text-primary) text-xl">
                    Batch Progression
                </h1>
                <p className="text-(--mui-palette-text-secondary) text-sm">
                    Advance a cohort into the next year level and enroll them into their curriculum subjects for
                    the target term. Always preview before running — nothing is written until you confirm.
                </p>
            </div>
            <CommonCard
                cardHeaderProps={{
                    subheader: 'Choose the term and narrow the cohort, then preview the proposed changes.',
                    title: 'Cohort'
                }}
                variant="outlined"
            >
                <div className="flex flex-col gap-4 p-4 pt-0">
                    <ProgressionCohortForm
                        control={cohortMethods.control}
                        id={COHORT_FORM_ID}
                        programOptions={programOptions}
                        termOptions={termOptions}
                        onSubmit={cohortMethods.handleSubmit(handlePreview, handlePreviewError)}
                    />
                    <div className="flex gap-3 justify-end">
                        <CommonButton
                            form={COHORT_FORM_ID}
                            size="small"
                            startIcon={<MagnifyingGlassIcon size={16} />}
                            type="submit"
                            variant="outlined"
                        >
                            Preview
                        </CommonButton>
                        <CommonButton
                            disabled={!hasWork}
                            size="small"
                            startIcon={<ArrowsClockwiseIcon size={16} />}
                            onClick={function() {
                                setIsConfirmOpen(true);
                            }}
                        >
                            Run Progression
                        </CommonButton>
                    </div>
                </div>
            </CommonCard>
            {preview && (
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                    {SUMMARY_TILES.map(function(tile) {
                        return (
                            <div
                                className="bg-(--mui-palette-action-hover) flex flex-col p-4 rounded-lg"
                                key={tile.label}
                            >
                                <span className="text-(--mui-palette-text-secondary) text-xs">
                                    {tile.label}
                                </span>
                                <span className="font-semibold text-(--mui-palette-text-primary) text-lg">
                                    {tile.resolveValue(preview)}
                                </span>
                            </div>
                        );
                    })}
                </div>
            )}
            {preview && (
                <CommonCard
                    cardHeaderProps={{
                        subheader: `Proposed changes for ${preview.term_label}. Select a row to review the subject plan.`,
                        title: 'Preview'
                    }}
                    className="flex flex-1 flex-col min-h-0"
                    variant="outlined"
                >
                    <div className="flex-1 min-h-0 p-4 pt-0">
                        <CommonTable<ProgressionPreviewRow>
                            getRowId={(params) => params.data.student_id}
                            leadingColumnDefs={columnDefs}
                            rowData={preview.rows}
                            onRowClicked={function(event) {
                                setSelectedRow(event.data ?? null);
                            }}
                        />
                    </div>
                </CommonCard>
            )}
            <ConfirmPromptModal
                cardProps={{
                    cardHeaderProps: {
                        title: 'Run Batch Progression'
                    }
                }}
                formButtonsProps={{
                    cancelProps: {
                        onClick: function() {
                            setIsConfirmOpen(false);
                        }
                    },
                    confirmProps: {
                        children: 'Run Progression',
                        onClick: handleConfirmRun
                    }
                }}
                mainContent={{
                    children: preview
                        ? `Promote ${preview.promote_count} student(s) and create ${preview.enrollable_count} enrollment(s)?`
                        : ''
                }}
                open={isConfirmOpen}
                subContent={{
                    children: 'Year level changes are recorded on each student lifecycle. Enrollments can still be dropped afterwards from Enrollment Management.'
                }}
                onClose={function() {
                    setIsConfirmOpen(false);
                }}
            />
            <ProgressionDetailModal
                open={Boolean(selectedRow)}
                row={selectedRow}
                onClose={function() {
                    setSelectedRow(null);
                }}
            />
            <ProgressionResultModal
                open={Boolean(runResult)}
                result={runResult}
                onClose={function() {
                    setRunResult(null);
                }}
            />
        </div>
    );
}