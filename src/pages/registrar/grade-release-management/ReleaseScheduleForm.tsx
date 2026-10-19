import CommonButton from '@components/button/CommonButton';
import ValidCommonDateTimePicker from '@components/datepicker/ValidCommonDateTimepicker';
import CommonActionModal from '@components/modal/CommonActionModal';
import DiscardChangesPromptModal from '@components/modal/DiscardChangesPromptModal';
import DraftRecoveryPromptModal from '@components/modal/DraftRecoveryPromptModal';
import { useFormDraft } from '@hooks/useFormDraft';
import { GradeReleaseSchedule, ReleaseScheduleFormValues } from '@type/grade-release.type';
import { DEFAULT_FORM_OPTIONS, formErrors } from '@utils/form.util';
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';

interface ReleaseScheduleFormProps {
    isSaving: boolean;
    open: boolean;
    period: GradeReleaseSchedule | null;
    onClear: () => void;
    onClose: () => void;
    onSave: (releaseAt: string) => void;
}

export default function ReleaseScheduleForm({
    isSaving,
    open,
    period,
    onClear,
    onClose,
    onSave
}: ReleaseScheduleFormProps) {
    const [isConfirmCloseOpen, setIsConfirmCloseOpen] = useState(false);
    const prevOpenRef = useRef(open);
    const methods = useForm<ReleaseScheduleFormValues>({
        ...DEFAULT_FORM_OPTIONS,
        defaultValues: { release_at: period?.release_at ?? '' }
    });
    const {
        control, handleSubmit, reset
    } = methods;

    const draftGuard = useFormDraft<ReleaseScheduleFormValues>({
        control,
        enabled: open,
        formId: period?.grading_period_id
            ? `release-schedule-${period.grading_period_id}`
            : 'release-schedule-form',
        onRestore: function(restoredValues) {
            reset(restoredValues, { keepDefaultValues: true });
        }
    });

    useEffect(function() {
        reset({ release_at: period?.release_at ?? '' });
    }, [period, reset]);

    useEffect(function() {
        if (prevOpenRef.current && !open) {
            draftGuard.clearDraft();
            setIsConfirmCloseOpen(false);
        }
        prevOpenRef.current = open;
    }, [open, draftGuard]);

    function submitSchedule(values: ReleaseScheduleFormValues) {
        draftGuard.clearDraft();
        onSave(values.release_at);
    }

    function handleConfirm() {
        handleSubmit(submitSchedule, function(errors) {
            formErrors(errors, methods);
        })();
    }

    function handleAttemptClose() {
        if (isSaving) return;
        if (draftGuard.hasRealChanges) {
            setIsConfirmCloseOpen(true);
            return;
        }
        draftGuard.clearDraft();
        onClose();
    }

    function handleDiscardChanges() {
        setIsConfirmCloseOpen(false);
        draftGuard.clearDraft();
        reset({ release_at: period?.release_at ?? '' });
        onClose();
    }

    function handleClearSchedule() {
        draftGuard.clearDraft();
        onClear();
    }

    return (
        <>
            <CommonActionModal
                cardProps={{
                    cardHeaderProps: {
                        subheader: period
                            ? 'Grades for this period are released automatically once the scheduled date and time passes.'
                            : '',
                        title: period
                            ? `Schedule Release — ${period.grading_period_name}`
                            : 'Schedule Release'
                    },
                    className: 'w-full sm:w-[min(94vw,560px)]'
                }}
                formButtonsProps={{
                    cancelProps: {
                        children: 'Cancel',
                        disabled: isSaving,
                        onClick: handleAttemptClose
                    },
                    confirmProps: {
                        children: isSaving
                            ? 'Saving...'
                            : 'Save Schedule',
                        disabled: isSaving || !draftGuard.hasRealChanges,
                        loading: isSaving,
                        onClick: handleConfirm
                    }
                }}
                open={open}
                onClose={handleAttemptClose}
            >
                <div className="flex flex-col gap-4">
                    <ValidCommonDateTimePicker<ReleaseScheduleFormValues>
                        control={control}
                        disabled={isSaving}
                        hasHelper
                        helperText="Grades stay hidden from students until this moment. A student who has not yet submitted their faculty evaluation stays blocked until they do."
                        label="Release date and time"
                        name="release_at"
                        rules={{ required: 'Select the date and time when grades become visible.' }}
                    />
                    {period?.release_at
                        ? (
                            <div className="flex flex-col gap-2">
                                <p className="text-[var(--mui-palette-text-secondary)] text-xs">
                                    Removing the schedule stops any further automatic release. Grades already released stay visible.
                                </p>
                                <CommonButton
                                    color="error"
                                    disabled={isSaving}
                                    variant="outlined"
                                    onClick={handleClearSchedule}
                                >
                                    Remove Schedule
                                </CommonButton>
                            </div>
                        )
                        : null
                    }
                </div>
            </CommonActionModal>
            <DraftRecoveryPromptModal
                open={draftGuard.isPromptOpen}
                onContinue={draftGuard.handleContinue}
                onDiscard={draftGuard.handleDiscard}
            />
            <DiscardChangesPromptModal
                open={isConfirmCloseOpen}
                onContinueEditing={function() {
                    setIsConfirmCloseOpen(false);
                }}
                onDiscard={handleDiscardChanges}
            />
        </>
    );
}