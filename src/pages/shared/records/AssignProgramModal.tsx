import CommonButton from '@components/button/CommonButton';
import CommonInput from '@components/input/CommonInput';
import CommonModal from '@components/modal/CommonModal';
import DiscardChangesPromptModal from '@components/modal/DiscardChangesPromptModal';
import DraftRecoveryPromptModal from '@components/modal/DraftRecoveryPromptModal';
import CommonSelect, { CommonSelectOption } from '@components/select/CommonSelect';
import { useObjectDraft } from '@hooks/useFormDraft';
import FormControlLabel from '@mui/material/FormControlLabel';
import Checkbox from '@mui/material/Checkbox';
import { ArrowsClockwiseIcon } from '@phosphor-icons/react';
import { getPrograms } from '@services/program/program.service';
import { registrarAssignStudentProgramAndYear, syncStudentYearLevel } from '@services/registrar-verification.service';
import { shiftStudentProgram } from '@services/records.service';
import { useToastStore } from '@stores/toast.store';
import { useEffect, useMemo, useState } from 'react';

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
    onClose: () => void;
    onSuccess?: () => void;
    studentId?: string | null;
    currentProgramId?: string | null;
    currentProgramName?: string | null;
    currentYearLevel?: number | null;
    currentYearLevelOverridden?: boolean;
    title?: string;
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
    const [selectedProgramId, setSelectedProgramId] = useState<string>('');
    const [selectedYearLevel, setSelectedYearLevel] = useState<number>(1);
    const [isOverride, setIsOverride] = useState<boolean>(false);
    const [reason, setReason] = useState<string>('');
    const [isSaving, setIsSaving] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [isLoadingPrograms, setIsLoadingPrograms] = useState(false);
    const [isDiscardOpen, setIsDiscardOpen] = useState(false);

    const initialYearLevel = currentYearLevel && currentYearLevel >= 1 && currentYearLevel <= 6
        ? currentYearLevel
        : 1;

    const defaultDraftValues = useMemo(() => ({
        selectedProgramId: currentProgramId ?? '',
        selectedYearLevel: initialYearLevel,
        isOverride: currentYearLevelOverridden,
        reason: ''
    }), [currentProgramId, initialYearLevel, currentYearLevelOverridden]);

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
            setSelectedProgramId(restored.selectedProgramId ?? '');
            setSelectedYearLevel(restored.selectedYearLevel ?? 1);
            setIsOverride(Boolean(restored.isOverride));
            setReason(restored.reason ?? '');
        },
        enabled: open
    });

    useEffect(function() {
        if (!open) {
            setIsDiscardOpen(false);
            return;
        }

        setSelectedProgramId(currentProgramId ?? '');
        setSelectedYearLevel(initialYearLevel);
        setIsOverride(currentYearLevelOverridden);
        setReason('');

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
    }, [open, currentProgramId, initialYearLevel, currentYearLevelOverridden]);

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
            setSelectedYearLevel(res.data.calculated_year_level);
            setIsOverride(false);
            useToastStore.getState().showToast(
                `Calculated Year Level from Curriculum: Year ${res.data.calculated_year_level}`,
                'info'
            );
        }
    }

    async function handleSave() {
        if (!selectedProgramId) return;

        setIsSaving(true);
        let error: unknown = null;

        if (studentId) {
            const res = await registrarAssignStudentProgramAndYear(
                studentId,
                selectedProgramId,
                selectedYearLevel,
                isOverride,
                reason.trim() || undefined
            );
            error = res.error;
        } else {
            const res = await shiftStudentProgram(null, {
                effective_date: new Date().toISOString().slice(0, 10),
                program_id: selectedProgramId,
                reason: reason.trim() || undefined,
                year_level: selectedYearLevel
            });
            error = res.error;
        }

        setIsSaving(false);

        if (!error) {
            draftGuard.clearDraft();
            useToastStore.getState().showToast(
                currentProgramId ? 'Program & Year Level updated successfully.' : 'Program assigned successfully.',
                'success'
            );
            onSuccess?.();
            onClose();
        }
    }

    const isUnchanged = selectedProgramId === (currentProgramId ?? '')
        && selectedYearLevel === (currentYearLevel ?? 1)
        && isOverride === currentYearLevelOverridden;

    return (
        <>
            <CommonModal
                open={open}
                onClose={handleRequestClose}
                cardProps={{
                    cardHeaderProps: {
                        title: title || (currentProgramId ? 'Manage Program & Year Level' : 'Assign Academic Program & Year Level'),
                        subheader: currentProgramName
                            ? `Currently assigned: ${currentProgramName} (Year ${currentYearLevel ?? 1})`
                            : 'Assign degree program and year level under Registrar supervision.'
                    }
                }}
            >
                <div className="flex flex-col gap-4 p-4 pt-0">
                    <CommonSelect
                        disabled={isSaving || isLoadingPrograms}
                        fullWidth
                        label="Academic Program"
                        options={programOptions}
                        size="small"
                        value={selectedProgramId}
                        onChange={function(e) {
                            setSelectedProgramId(e.target.value as string);
                        }}
                    />

                    <div className="flex items-center gap-2">
                        <div className="flex-1">
                            <CommonSelect
                                disabled={isSaving}
                                fullWidth
                                label="Year Level"
                                options={YEAR_LEVEL_OPTIONS}
                                size="small"
                                value={selectedYearLevel}
                                onChange={function(e) {
                                    setSelectedYearLevel(Number(e.target.value));
                                }}
                            />
                        </div>
                        {Boolean(studentId) && (
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
                        )}
                    </div>

                    <div className="bg-(--mui-palette-action-hover) p-3 rounded-lg flex flex-col gap-1">
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={isOverride}
                                    disabled={isSaving}
                                    size="small"
                                    onChange={(e) => setIsOverride(e.target.checked)}
                                />
                            }
                            label={
                                <span className="text-sm font-medium text-(--mui-palette-text-primary)">
                                    Manual Year Level Override
                                </span>
                            }
                        />
                        <p className="text-xs text-(--mui-palette-text-secondary) m-0 ml-7">
                            When unchecked, the student's year level will automatically update when they complete all required curriculum subjects. Check this if the Registrar needs to manually override or hold the year level.
                        </p>
                    </div>

                    <CommonInput
                        disabled={isSaving}
                        fullWidth
                        label="Reason / Notes (Optional)"
                        placeholder="e.g. Initial assignment, curriculum transfer, or manual override"
                        size="small"
                        value={reason}
                        onChange={function(e) {
                            setReason(e.target.value);
                        }}
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
                            disabled={isSaving || !selectedProgramId || isUnchanged}
                            size="small"
                            variant="contained"
                            onClick={handleSave}
                        >
                            {isSaving
                                ? 'Saving...'
                                : (currentProgramId ? 'Update Program & Year' : 'Assign Program')}
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
