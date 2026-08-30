import CommonButton from '@components/button/CommonButton';
import ValidCommonDateTimePicker from '@components/datepicker/ValidCommonDateTimepicker';
import FormErrorSummary from '@components/form/FormErrorSummary';
import CommonActionModal from '@components/modal/CommonActionModal';
import { GradeReleaseSchedule, ReleaseScheduleFormValues } from '@type/grade-release.type';
import { formErrors } from '@utils/form.util';
import { useEffect } from 'react';
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
    const methods = useForm<ReleaseScheduleFormValues>({
        defaultValues: { release_at: '' }
    });
    const {
        control, formState, handleSubmit, reset
    } = methods;

    useEffect(function() {
        reset({ release_at: period?.release_at ?? '' });
    }, [period, reset]);

    function submitSchedule(values: ReleaseScheduleFormValues) {
        onSave(values.release_at);
    }

    function handleConfirm() {
        handleSubmit(submitSchedule, function(errors) {
            formErrors(errors, methods);
        })();
    }

    return (
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
            closeOnBackdropClick={!isSaving}
            formButtonsProps={{
                cancelProps: {
                    children: 'Cancel',
                    disabled: isSaving,
                    onClick: onClose
                },
                confirmProps: {
                    children: isSaving
                        ? 'Saving...'
                        : 'Save Schedule',
                    disabled: isSaving || !formState.isDirty,
                    onClick: handleConfirm
                }
            }}
            open={open}
            onClose={onClose}
        >
            <div className="flex flex-col gap-4">
                <FormErrorSummary control={control} />
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
                                onClick={onClear}
                            >
                                Remove Schedule
                            </CommonButton>
                        </div>
                    )
                    : null
                }
            </div>
        </CommonActionModal>
    );
}