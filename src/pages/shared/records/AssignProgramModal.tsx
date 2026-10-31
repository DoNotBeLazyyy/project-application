import CommonButton from '@components/button/CommonButton';
import ValidCommonCheckbox from '@components/checkbox/ValidCommonCheckbox';
import CommonForm from '@components/form/CommonForm';
import { FormFieldConfig } from '@components/form/FormField';
import CommonModal from '@components/modal/CommonModal';
import DiscardChangesPromptModal from '@components/modal/DiscardChangesPromptModal';
import DraftRecoveryPromptModal from '@components/modal/DraftRecoveryPromptModal';
import { CommonSelectOption } from '@components/select/CommonSelect';
import { useObjectDraft } from '@hooks/useFormDraft';
import { ArrowsClockwiseIcon } from '@phosphor-icons/react';
import { getPrograms } from '@services/program/program.service';
import { shiftStudentProgram } from '@services/records.service';
import { registrarAssignStudentProgramAndYear, syncStudentYearLevel } from '@services/registrar-verification.service';
import { useToastStore } from '@stores/toast.store';
import { useEffect, useMemo, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';

const YEAR_LEVEL_OPTIONS: CommonSelectOption[] = [
    { label: '1st Year', value: 1 },
    { label: '2nd Year', value: 2 },
    { label: '3rd Year', value: 3 },
    { label: '4th Year', value: 4 },
    { label: '5th Year', value: 5 },
    { label: '6th Year', value: 6 }
];

export interface AssignProgramModalProps {
    open: boolean;
    onClose: VoidFunction;
    onSuccess?: VoidFunction;
    studentId?: string | null;
    currentProgramId?: string | null;
    currentProgramName?: string | null;
    currentYearLevel?: number | null;
    currentYearLevelOverridden?: boolean;
    title?: string;
}

interface AssignProgramFormValues {
    selectedProgramId: string;
    selectedYearLevel: number;
    isOverride: boolean;
    reason: string;
}

export default function AssignProgramModal({
    open,
    onClose,
    onSuccess,
    studentId,
    currentProgramId,
    currentProgramName,
    currentYearLevel,
    currentYearLevelOverridden = false,
    title
}: AssignProgramModalProps) {
    const [programOptions, setProgramOptions] = useState<CommonSelectOption[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [isLoadingPrograms, setIsLoadingPrograms] = useState(false);
    const [isDiscardOpen, setIsDiscardOpen] = useState(false);

    const initialYearLevel = currentYearLevel && currentYearLevel >= 1 && currentYearLevel <= 6
        ? currentYearLevel
        : 1;

    const defaultDraftValues = useMemo<AssignProgramFormValues>(() => ({
        selectedProgramId: currentProgramId ?? '',
        selectedYearLevel: initialYearLevel,
        isOverride: currentYearLevelOverridden,
        reason: ''
    }), [currentProgramId, initialYearLevel, currentYearLevelOverridden]);

    const { control, handleSubmit, reset, setValue } = useForm<AssignProgramFormValues>({
        defaultValues: defaultDraftValues
    });
    const watchedValues = useWatch({ control });
    const selectedProgramId = watchedValues.selectedProgramId ?? '';
    const selectedYearLevel = Number(watchedValues.selectedYearLevel ?? 1);
    const isOverride = Boolean(watchedValues.isOverride);
    const reason = watchedValues.reason ?? '';

    const currentDraftValues = useMemo(() => ({
        selectedProgramId,
        selectedYearLevel,
        isOverride,
        reason
    }), [selectedProgramId, selectedYearLevel, isOverride, reason]);

    const draftGuard = useObjectDraft({
        formId: `assign-program-modal-${studentId ?? 'self'}`,
        values: currentDraftValues,
        defaultValues: defaultDraftValues,
        onRestore: (restored) => {
            setValue('selectedProgramId', restored.selectedProgramId ?? '');
            setValue('selectedYearLevel', restored.selectedYearLevel ?? 1);
            setValue('isOverride', Boolean(restored.isOverride));
            setValue('reason', restored.reason ?? '');
        },
        enabled: open
    });

    useEffect(function() {
        if (!open) {
            setIsDiscardOpen(false);
            return;
        }

        reset(defaultDraftValues);

        async function fetchPrograms() {
            setIsLoadingPrograms(true);
            const result = await getPrograms();
            if (result.data) {
                setProgramOptions(
                    result.data.map(function(program) {
                        return {
                            label: `${program.code} · ${program.label}`,
                            value: program.id
                        };
                    })
                );
            }
            setIsLoadingPrograms(false);
        }

        fetchPrograms();
    }, [open, defaultDraftValues, reset]);

    const fields: FormFieldConfig<AssignProgramFormValues>[] = [
        {
            disabled: isSaving || isLoadingPrograms,
            gridCols: 2,
            label: 'Academic Program',
            name: 'selectedProgramId',
            options: programOptions,
            rules: { required: 'Academic program is required' },
            type: 'select'
        },
        {
            disabled: isSaving,
            gridCols: 2,
            label: 'Year Level',
            name: 'selectedYearLevel',
            options: YEAR_LEVEL_OPTIONS,
            rules: { required: 'Year level is required' },
            type: 'select'
        }
    ];

    const reasonFields: FormFieldConfig<AssignProgramFormValues>[] = [
        {
            disabled: isSaving,
            gridCols: 2,
            label: 'Reason / Notes (Optional)',
            name: 'reason',
            placeholder: 'e.g. Initial assignment, curriculum transfer, or manual override',
            type: 'text'
        }
    ];

    function handleRequestClose() {
        if (draftGuard.hasRealChanges) {
            setIsDiscardOpen(true);
            return;
        }
        draftGuard.clearDraft();
        onClose();
    }

    function handleConfirmDiscard() {
        draftGuard.clearDraft();
        setIsDiscardOpen(false);
        onClose();
    }

    async function handleSyncCurriculum() {
        if (!studentId) return;
        setIsSyncing(true);
        const res = await syncStudentYearLevel(studentId);
        setIsSyncing(false);
        if (res.data) {
            setValue('selectedYearLevel', res.data.calculated_year_level);
            setValue('isOverride', false);
            useToastStore.getState()
                .showToast(
                    `Calculated Year Level from Curriculum: Year ${res.data.calculated_year_level}`,
                    'info'
                );
        }
    }

    async function saveAssignment(values: AssignProgramFormValues) {
        const yearLevel = Number(values.selectedYearLevel);
        const trimmedReason = values.reason.trim() || undefined;

        setIsSaving(true);
        let error: unknown = null;

        if (studentId) {
            const res = await registrarAssignStudentProgramAndYear(
                studentId,
                values.selectedProgramId,
                yearLevel,
                values.isOverride,
                trimmedReason
            );
            error = res.error;
        }
        else {
            const res = await shiftStudentProgram(null, {
                effective_date: new Date()
                    .toISOString()
                    .slice(0, 10),
                program_id: values.selectedProgramId,
                reason: trimmedReason,
                year_level: yearLevel
            });
            error = res.error;
        }

        setIsSaving(false);

        if (!error) {
            draftGuard.clearDraft();
            useToastStore.getState()
                .showToast(
                    currentProgramId
                        ? 'Program & Year Level updated successfully.'
                        : 'Program assigned successfully.',
                    'success'
                );
            onSuccess?.();
            onClose();
        }
    }

    function handleSave() {
        handleSubmit(saveAssignment)();
    }

    const isUnchanged = selectedProgramId === (currentProgramId ?? '')
        && selectedYearLevel === (currentYearLevel ?? 1)
        && isOverride === currentYearLevelOverridden;

    return (
        <>
            <CommonModal
                cardProps={{
                    cardHeaderProps: {
                        title: title || (currentProgramId
                            ? 'Manage Program & Year Level'
                            : 'Assign Academic Program & Year Level'),
                        subheader: currentProgramName
                            ? `Currently assigned: ${currentProgramName} (Year ${currentYearLevel ?? 1})`
                            : 'Assign degree program and year level under Registrar supervision.'
                    }
                }}
                open={open}
                onClose={handleRequestClose}
            >
                <div className="flex flex-col gap-4 p-4 pt-0">
                    <CommonForm
                        component="div"
                        containerClassName="grid grid-cols-1 md:grid-cols-2 gap-4"
                        control={control}
                        enableDraftRecovery={false}
                        fields={fields}
                    />

                    {Boolean(studentId) && (
                        <div className="flex justify-end">
                            <CommonButton
                                disabled={isSaving || isSyncing}
                                loading={isSyncing}
                                size="small"
                                startIcon={<ArrowsClockwiseIcon size={16} />}
                                variant="outlined"
                                onClick={handleSyncCurriculum}
                            >
                                Sync Curriculum
                            </CommonButton>
                        </div>
                    )}

                    <div className="bg-(--mui-palette-action-hover) p-3 rounded-lg flex flex-col gap-1">
                        <ValidCommonCheckbox
                            control={control}
                            disabled={isSaving}
                            label="Manual Year Level Override"
                            name="isOverride"
                        />
                        <p className="text-xs text-(--mui-palette-text-secondary) m-0 ml-7">
                            When unchecked, the student's year level will automatically update when they complete all required curriculum subjects. Check this if the Registrar needs to manually override or hold the year level.
                        </p>
                    </div>

                    <CommonForm
                        component="div"
                        containerClassName="grid grid-cols-1 md:grid-cols-2 gap-4"
                        control={control}
                        enableDraftRecovery={false}
                        fields={reasonFields}
                    />

                    <div className="flex gap-2 justify-end mt-2">
                        <CommonButton
                            color="inherit"
                            disabled={isSaving}
                            size="small"
                            variant="outlined"
                            onClick={handleRequestClose}
                        >
                            Cancel
                        </CommonButton>
                        <CommonButton
                            disabled={isSaving || isUnchanged}
                            loading={isSaving}
                            size="small"
                            variant="contained"
                            onClick={handleSave}
                        >
                            {isSaving
                                ? 'Saving...'
                                : (currentProgramId
                                    ? 'Update Program & Year'
                                    : 'Assign Program')}
                        </CommonButton>
                    </div>
                </div>
            </CommonModal>

            <DiscardChangesPromptModal
                open={isDiscardOpen}
                onContinueEditing={() => setIsDiscardOpen(false)}
                onDiscard={handleConfirmDiscard}
            />

            <DraftRecoveryPromptModal
                open={draftGuard.isPromptOpen}
                onContinue={draftGuard.handleContinue}
                onDiscard={draftGuard.handleDiscard}
            />
        </>
    );
}