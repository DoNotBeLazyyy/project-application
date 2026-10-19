import CommonInput from '@components/input/CommonInput';
import CommonActionModal from '@components/modal/CommonActionModal';
import DiscardChangesPromptModal from '@components/modal/DiscardChangesPromptModal';
import DraftRecoveryPromptModal from '@components/modal/DraftRecoveryPromptModal';
import { useObjectDraft } from '@hooks/useFormDraft';
import { SpecialGradeFlag } from '@type/grading-config.type';
import { describeEvidence } from '@utils/special-grade.util';
import { useEffect, useMemo, useState } from 'react';

export interface SpecialGradeFlagModalProps {
    open: boolean;
    flag: SpecialGradeFlag | null;
    isBusy?: boolean;
    onClose: () => void;
    onConfirm: (reason: string) => void;
}

const DEFAULT_FLAG_DRAFT = { reason: '' };

/**
 * SpecialGradeFlagModal
 *
 * Collects the reason for dismissing a special grade flag.
 *
 * The reason is mandatory, and the database rejects an empty one too. Dismissal
 * is the path where a student who met a written policy does not receive the
 * mark, so it is the decision most likely to be questioned later — it earns an
 * explanation on the record more than applying the mark does.
 */
export default function SpecialGradeFlagModal({
    open,
    flag,
    isBusy = false,
    onClose,
    onConfirm
}: SpecialGradeFlagModalProps) {
    const [reason, setReason] = useState('');
    const [isDiscardOpen, setIsDiscardOpen] = useState(false);

    const currentDraftValues = useMemo(() => ({ reason }), [reason]);

    const draftGuard = useObjectDraft({
        formId: flag?.id
            ? `special-grade-flag-dismiss-${flag.id}`
            : 'special-grade-flag-dismiss',
        values: currentDraftValues,
        defaultValues: DEFAULT_FLAG_DRAFT,
        onRestore: (restored) => {
            setReason(restored.reason ?? '');
        },
        enabled: open
    });

    useEffect(function() {
        if (open) {
            setReason('');
        } else {
            setIsDiscardOpen(false);
        }
    }, [open, flag?.id]);

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

    const trimmed = reason.trim();

    return (
        <>
            <CommonActionModal
                cardProps={{
                    cardHeaderProps: {
                        subheader: flag
                            ? `${flag.code} — ${flag.full_name} (${flag.student_number})`
                            : '',
                        title: 'Dismiss special grade flag'
                    }
                }}
                containerClassName="max-w-full w-[34rem]"
                formButtonsProps={{
                    cancelProps: {
                        children: 'Cancel',
                        disabled: isBusy,
                        onClick: handleRequestClose
                    },
                    confirmProps: {
                        children: 'Dismiss flag',
                        disabled: isBusy || trimmed.length === 0,
                        loading: isBusy,
                        onClick: () => {
                            draftGuard.clearDraft();
                            onConfirm(trimmed);
                        }
                    }
                }}
                open={open}
                onClose={handleRequestClose}
            >
                <div className="flex flex-col gap-4">
                    <div className="bg-(--mui-palette-action-hover) flex flex-col gap-1 p-3 rounded-lg">
                        <span className="text-(--mui-palette-text-secondary) text-xs">
                            Why the system flagged this student
                        </span>
                        <span className="text-(--mui-palette-text-primary) text-sm">
                            {flag
                                ? describeEvidence(flag.evidence)
                                : '—'}
                        </span>
                    </div>

                    <CommonInput
                        fullWidth
                        helperText="Recorded against the grade audit log. Required."
                        label="Reason for dismissing"
                        minRows={3}
                        multiline
                        value={reason}
                        variant="outlined"
                        onChange={(event) => setReason(event.target.value)}
                    />
                </div>
            </CommonActionModal>

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