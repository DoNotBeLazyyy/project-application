import CommonActionModal from '@components/modal/CommonActionModal';
import ValidCommonTextarea from '@components/textarea/ValidCommonTextArea';
import { ArrowUUpLeftIcon } from '@phosphor-icons/react';
import { returnSectionGradesToFaculty } from '@services/grade-release.service';
import { ReturnToFacultyFormValues, SectionGradeSubmissionRow } from '@type/grade-release.type';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';

interface ReturnToFacultyModalProps {
    gradingPeriodId: string;
    gradingPeriodName: string;
    open: boolean;
    section: SectionGradeSubmissionRow | null;
    onClose: VoidFunction;
    onReturned?: VoidFunction;
}

const DEFAULT_VALUES: ReturnToFacultyFormValues = { reason: '' };

/**
 * Asks the registrar why a section's submitted grades go back to the faculty, then sends
 * them back as drafts. The faculty gets a notification with the reason.
 */
export default function ReturnToFacultyModal({
    gradingPeriodId,
    gradingPeriodName,
    open,
    section,
    onClose,
    onReturned
}: ReturnToFacultyModalProps) {
    const [isReturning, setIsReturning] = useState(false);
    const { control, handleSubmit, reset } = useForm<ReturnToFacultyFormValues>({
        defaultValues: DEFAULT_VALUES
    });

    useEffect(function() {
        if (open) {
            reset(DEFAULT_VALUES);
        }
    }, [open, reset]);

    /**
     * Sends the grades back. callRpc shows the server's success or error message.
     */
    async function handleReturn(values: ReturnToFacultyFormValues) {
        if (!section || !gradingPeriodId || isReturning) {
            return;
        }

        setIsReturning(true);
        try {
            const result = await returnSectionGradesToFaculty(section.section_id, gradingPeriodId, values.reason.trim());
            if (result.data?.success) {
                onReturned?.();
                onClose();
            }
        }
        finally {
            setIsReturning(false);
        }
    }

    function handleConfirm() {
        handleSubmit(handleReturn)();
    }

    if (!section) {
        return null;
    }

    return (
        <CommonActionModal
            cardProps={{
                cardHeaderProps: {
                    subheader: `${section.course_code} (${section.section_code}) · ${gradingPeriodName}`,
                    title: 'Return Grades to Faculty'
                }
            }}
            containerClassName="max-w-lg w-full"
            formButtonsProps={{
                cancelProps: {
                    children: 'Cancel',
                    disabled: isReturning,
                    onClick: onClose
                },
                confirmProps: {
                    children: (
                        <div className="flex gap-1.5 items-center">
                            <ArrowUUpLeftIcon
                                size={16}
                                weight="bold"
                            />
                            <span>
                                {isReturning
                                    ? 'Returning...'
                                    : 'Return to Faculty'}
                            </span>
                        </div>
                    ),
                    color: 'warning',
                    disabled: isReturning,
                    loading: isReturning,
                    onClick: handleConfirm
                }
            }}
            open={open}
            onClose={onClose}
        >
            <div className="flex flex-col gap-3">
                <p className="m-0 text-(--mui-palette-text-secondary) text-sm">
                    The submitted grades go back to
                    {' '}
                    <span className="font-semibold text-(--mui-palette-text-primary)">{section.faculty_name}</span>
                    {' '}
                    as drafts so they can be corrected and submitted again. Approved and released grades are not changed.
                </p>
                <ValidCommonTextarea
                    control={control}
                    disabled={isReturning}
                    hasHelper
                    label="Reason"
                    name="reason"
                    placeholder="e.g. Midterm grades for 3 students are missing their exam scores."
                    rows={3}
                    rules={{
                        required: 'Reason is required',
                        validate: (value: string) => value.trim().length > 0 || 'Reason cannot be only spaces'
                    }}
                />
            </div>
        </CommonActionModal>
    );
}