import CommonButton from '@components/button/CommonButton';
import CommonInput from '@components/input/CommonInput';
import CommonModal from '@components/modal/CommonModal';
import CommonSelect, { CommonSelectOption } from '@components/select/CommonSelect';
import { getPrograms } from '@services/program/program.service';
import { shiftStudentProgram } from '@services/records.service';
import { useToastStore } from '@stores/toast.store';
import { useEffect, useState } from 'react';

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
    title
}: AssignProgramModalProps) {
    const [programOptions, setProgramOptions] = useState<CommonSelectOption[]>([]);
    const [selectedProgramId, setSelectedProgramId] = useState<string>('');
    const [selectedYearLevel, setSelectedYearLevel] = useState<number>(1);
    const [reason, setReason] = useState<string>('');
    const [isSaving, setIsSaving] = useState(false);
    const [isLoadingPrograms, setIsLoadingPrograms] = useState(false);

    useEffect(function() {
        if (!open) return;

        setSelectedProgramId(currentProgramId ?? '');
        setSelectedYearLevel(currentYearLevel && currentYearLevel >= 1 && currentYearLevel <= 6 ? currentYearLevel : 1);
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
    }, [open, currentProgramId, currentYearLevel]);

    async function handleSave() {
        if (!selectedProgramId) return;

        setIsSaving(true);
        const result = await shiftStudentProgram(studentId ?? null, {
            effective_date: new Date().toISOString().slice(0, 10),
            program_id: selectedProgramId,
            reason: reason.trim() || undefined,
            year_level: selectedYearLevel
        });
        setIsSaving(false);

        if (!result.error) {
            useToastStore.getState().showToast(
                currentProgramId ? 'Program updated successfully.' : 'Program assigned successfully.',
                'success'
            );
            onSuccess?.();
            onClose();
        }
    }

    const isUnchanged = selectedProgramId === (currentProgramId ?? '')
        && selectedYearLevel === (currentYearLevel ?? 1);

    return (
        <CommonModal
            open={open}
            onClose={onClose}
            cardProps={{
                cardHeaderProps: {
                    title: title || (currentProgramId ? 'Change Academic Program' : 'Assign Academic Program'),
                    subheader: currentProgramName
                        ? `Currently assigned: ${currentProgramName}`
                        : 'Select your degree program and year level.'
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

                {currentProgramId && (
                    <CommonInput
                        disabled={isSaving}
                        fullWidth
                        label="Reason for Shift / Change (Optional)"
                        placeholder="e.g. Approved shift to new program"
                        size="small"
                        value={reason}
                        onChange={function(e) {
                            setReason(e.target.value);
                        }}
                    />
                )}

                <div className="flex gap-2 justify-end mt-2">
                    <CommonButton
                        color="inherit"
                        disabled={isSaving}
                        size="small"
                        variant="outlined"
                        onClick={onClose}
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
                            : (currentProgramId ? 'Update Program' : 'Assign Program')}
                    </CommonButton>
                </div>
            </div>
        </CommonModal>
    );
}
