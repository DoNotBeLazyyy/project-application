import CommonButton from '@components/button/CommonButton';
import CommonForm from '@components/form/CommonForm';
import { FormFieldConfig } from '@components/form/FormField';
import CommonModal from '@components/modal/CommonModal';
import DiscardChangesPromptModal from '@components/modal/DiscardChangesPromptModal';
import DraftRecoveryPromptModal from '@components/modal/DraftRecoveryPromptModal';
import { CommonSelectOption } from '@components/select/CommonSelect';
import { useFormDraft } from '@hooks/use-form-draft';
import { PaperPlaneTiltIcon, WarningCircleIcon } from '@phosphor-icons/react';
import { sendStudentProfileNotification } from '@services/registrar-verification.service';
import { useToastStore } from '@stores/toast.store';
import { DEFAULT_FORM_OPTIONS, formErrors } from '@utils/form.util';
import { useEffect, useRef, useState } from 'react';
import { FieldErrors, useForm, useWatch } from 'react-hook-form';

interface NotifyStudentModalProps {
    open: boolean;
    onClose: VoidFunction;
    studentId?: string | null;
    studentName?: string;
    studentNumber?: string;
    onSuccess?: VoidFunction;
}

const TEMPLATE_OPTIONS: CommonSelectOption[] = [
    {
        label: 'Notice: Inaccurate Personal Information',
        value: 'notice_inaccurate'
    },
    {
        label: 'Notice: Birth Date / PSA Document Discrepancy',
        value: 'notice_birthdate'
    },
    {
        label: 'Notice: Name Spelling or Suffix Discrepancy',
        value: 'notice_name'
    },
    {
        label: 'Notice: False Information Warning',
        value: 'warning_false'
    },
    {
        label: 'Custom Notice',
        value: 'custom'
    }
];

const TEMPLATE_DEFAULTS: Record<string, { title: string; message: string }> = {
    notice_inaccurate: {
        title: 'Profile Verification Notice: Inaccurate Information',
        message: 'Your recent profile submission contains details that do not match our institutional records. Please review your information or present valid documentation to the Registrar.'
    },
    notice_birthdate: {
        title: 'Profile Verification: Birth Date Verification Required',
        message: 'The date of birth provided does not match your submitted birth certificate or PSA record. Please bring your original PSA certificate to the Registrar office for verification.'
    },
    notice_name: {
        title: 'Profile Verification: Name Discrepancy',
        message: 'Your legal name or suffix entered differs from your official admission records. Legal name changes require supporting legal documents presented to the Registrar.'
    },
    warning_false: {
        title: 'Warning: Inaccurate or False Profile Data Submitted',
        message: 'Providing false or misleading information in your official student profile is a violation of institutional policy. Please correct your profile immediately or report to the Registrar.'
    },
    custom: {
        title: '',
        message: ''
    }
};

interface NotifyStudentFormValues {
    selectedTemplate: string;
    title: string;
    message: string;
}

const INITIAL_NOTIFY_VALUES: NotifyStudentFormValues = {
    selectedTemplate: 'notice_inaccurate',
    title: TEMPLATE_DEFAULTS.notice_inaccurate.title,
    message: TEMPLATE_DEFAULTS.notice_inaccurate.message
};

const NOTIFY_FORM_ID = 'notify-student-form';

function requiredText(label: string) {
    return {
        required: `${label} is required.`,
        validate: (value: unknown) => String(value ?? '')
            .trim() !== '' || `${label} cannot be blank.`
    };
}

const NOTIFY_FIELDS: FormFieldConfig<NotifyStudentFormValues>[] = [
    {
        label: 'Notice Template',
        name: 'selectedTemplate',
        options: TEMPLATE_OPTIONS,
        type: 'select'
    },
    {
        label: 'Notification Title',
        name: 'title',
        rules: requiredText('Notification title'),
        type: 'text'
    },
    {
        label: 'Message Content',
        name: 'message',
        placeholder: 'Provide details on the discrepancy or instructions for the student...',
        rules: requiredText('Message content'),
        type: 'text-area'
    }
];

export default function NotifyStudentModal({
    open,
    onClose,
    studentId,
    studentName,
    studentNumber,
    onSuccess
}: NotifyStudentModalProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isConfirmCloseOpen, setIsConfirmCloseOpen] = useState(false);

    const methods = useForm<NotifyStudentFormValues>({ ...DEFAULT_FORM_OPTIONS, defaultValues: INITIAL_NOTIFY_VALUES });
    const selectedTemplate = useWatch({ control: methods.control, name: 'selectedTemplate' });
    const lastTemplateRef = useRef(INITIAL_NOTIFY_VALUES.selectedTemplate);

    const draftGuard = useFormDraft({
        control: methods.control,
        enabled: open,
        formId: studentId
            ? `notify-student-${studentId}`
            : NOTIFY_FORM_ID,
        onRestore: (restored) => {
            // A restored draft carries its own title/message - do not overwrite them with template text
            if (restored.selectedTemplate !== undefined) lastTemplateRef.current = restored.selectedTemplate;
        }
    });

    // Picking a template pre-fills the title and message
    useEffect(function() {
        if (!selectedTemplate || selectedTemplate === lastTemplateRef.current) return;
        lastTemplateRef.current = selectedTemplate;
        const tpl = TEMPLATE_DEFAULTS[selectedTemplate] || TEMPLATE_DEFAULTS.custom;
        methods.setValue('title', tpl.title, { shouldDirty: true });
        methods.setValue('message', tpl.message, { shouldDirty: true });
        methods.clearErrors(['title', 'message']);
    }, [selectedTemplate]);

    function resetToInitial() {
        lastTemplateRef.current = INITIAL_NOTIFY_VALUES.selectedTemplate;
        methods.reset(INITIAL_NOTIFY_VALUES);
    }

    function handleAttemptClose() {
        if (isSubmitting) return;
        if (draftGuard.hasRealChanges) {
            setIsConfirmCloseOpen(true);
            return;
        }
        draftGuard.clearDraft();
        resetToInitial();
        onClose();
    }

    function handleDiscardChanges() {
        setIsConfirmCloseOpen(false);
        draftGuard.clearDraft();
        resetToInitial();
        onClose();
    }

    function handleInvalid(errors: FieldErrors<NotifyStudentFormValues>) {
        formErrors(errors, methods);
    }

    async function handleSend(values: NotifyStudentFormValues) {
        if (!studentId) {
            useToastStore.getState()
                .showToast('Student ID is missing.', 'error');
            return;
        }

        setIsSubmitting(true);
        const result = await sendStudentProfileNotification(studentId, values.title.trim(), values.message.trim());
        setIsSubmitting(false);

        if (!result.error) {
            draftGuard.clearDraft();
            resetToInitial();
            useToastStore.getState()
                .showToast('Notification sent to student and recorded in Registrar Log.', 'success');
            onSuccess?.();
            onClose();
        }
    }

    return (
        <>
            <CommonModal
                cardProps={{
                    cardHeaderProps: {
                        title: 'Send Notification to Student',
                        subheader: `Recipient: ${studentName || 'Student'} (${studentNumber || 'N/A'})`
                    }
                }}
                fullWidth
                maxWidth="sm"
                open={open}
                onClose={handleAttemptClose}
            >
                <div className="flex flex-col gap-4 p-4 pt-0">
                    <div className="border border-(--mui-palette-error-main) bg-(--mui-palette-error-light) p-3 rounded-lg flex items-start gap-3 text-xs text-(--mui-palette-text-primary)">
                        <WarningCircleIcon
                            className="text-(--mui-palette-error-main) shrink-0 mt-0.5"
                            size={22}
                        />
                        <div>
                            <p className="font-semibold m-0 text-sm">Official Registrar Notification</p>
                            <p className="m-0 mt-0.5 text-(--mui-palette-text-secondary)">
                                This notification will be immediately dispatched to the student&apos;s notification center and recorded in the Registrar Log audit trail.
                            </p>
                        </div>
                    </div>

                    <CommonForm
                        control={methods.control}
                        enableDraftRecovery={false}
                        fields={NOTIFY_FIELDS.map((field) => ({ ...field, disabled: isSubmitting }))}
                        formProps={{
                            id: NOTIFY_FORM_ID,
                            onSubmit: methods.handleSubmit(handleSend, handleInvalid)
                        }}
                    />

                    <div className="flex gap-2 justify-end mt-2">
                        <CommonButton
                            color="inherit"
                            disabled={isSubmitting}
                            size="small"
                            variant="outlined"
                            onClick={handleAttemptClose}
                        >
                            Cancel
                        </CommonButton>
                        <CommonButton
                            disabled={isSubmitting}
                            form={NOTIFY_FORM_ID}
                            loading={isSubmitting}
                            size="small"
                            startIcon={<PaperPlaneTiltIcon size={16} />}
                            type="submit"
                            variant="contained"
                        >
                            {isSubmitting
                                ? 'Sending...'
                                : 'Send Notification'}
                        </CommonButton>
                    </div>
                </div>
            </CommonModal>
            <DraftRecoveryPromptModal
                open={draftGuard.isPromptOpen}
                onContinue={draftGuard.handleContinue}
                onDiscard={draftGuard.handleDiscard}
            />
            <DiscardChangesPromptModal
                open={isConfirmCloseOpen}
                onContinueEditing={() => setIsConfirmCloseOpen(false)}
                onDiscard={handleDiscardChanges}
            />
        </>
    );
}