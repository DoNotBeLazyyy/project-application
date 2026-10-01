import CommonButton from '@components/button/CommonButton';
import CommonInput from '@components/input/CommonInput';
import CommonModal from '@components/modal/CommonModal';
import CommonSelect, { CommonSelectOption } from '@components/select/CommonSelect';
import { PaperPlaneTiltIcon, WarningCircleIcon } from '@phosphor-icons/react';
import { sendStudentProfileNotification } from '@services/registrar-verification.service';
import { useToastStore } from '@stores/toast.store';
import { useState } from 'react';

interface NotifyStudentModalProps {
    open: boolean;
    onClose: () => void;
    studentId?: string | null;
    studentName?: string;
    studentNumber?: string;
    onSuccess?: () => void;
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

export default function NotifyStudentModal({
    open,
    onClose,
    studentId,
    studentName,
    studentNumber,
    onSuccess
}: NotifyStudentModalProps) {
    const [selectedTemplate, setSelectedTemplate] = useState('notice_inaccurate');
    const [title, setTitle] = useState(TEMPLATE_DEFAULTS.notice_inaccurate.title);
    const [message, setMessage] = useState(TEMPLATE_DEFAULTS.notice_inaccurate.message);
    const [isSubmitting, setIsSubmitting] = useState(false);

    function handleTemplateChange(templateKey: string) {
        setSelectedTemplate(templateKey);
        const tpl = TEMPLATE_DEFAULTS[templateKey] || TEMPLATE_DEFAULTS.custom;
        if (tpl.title) setTitle(tpl.title);
        if (tpl.message) setMessage(tpl.message);
    }

    async function handleSend() {
        if (!studentId) {
            useToastStore.getState().showToast('Student ID is missing.', 'error');
            return;
        }

        if (!title.trim() || !message.trim()) {
            useToastStore.getState().showToast('Title and message are required.', 'error');
            return;
        }

        setIsSubmitting(true);
        const result = await sendStudentProfileNotification(studentId, title.trim(), message.trim());
        setIsSubmitting(false);

        if (!result.error) {
            useToastStore.getState().showToast('Notification sent to student and recorded in Registrar Log.', 'success');
            onSuccess?.();
            onClose();
        }
    }

    return (
        <CommonModal
            fullWidth
            maxWidth="sm"
            open={open}
            onClose={onClose}
            cardProps={{
                cardHeaderProps: {
                    title: 'Send Notification to Student',
                    subheader: `Recipient: ${studentName || 'Student'} (${studentNumber || 'N/A'})`
                }
            }}
        >
            <div className="flex flex-col gap-4 p-4 pt-0">
                <div className="border border-(--mui-palette-error-main) bg-(--mui-palette-error-light) p-3 rounded-lg flex items-start gap-3 text-xs text-(--mui-palette-text-primary)">
                    <WarningCircleIcon size={22} className="text-(--mui-palette-error-main) shrink-0 mt-0.5" />
                    <div>
                        <p className="font-semibold m-0 text-sm">Official Registrar Notification</p>
                        <p className="m-0 mt-0.5 text-(--mui-palette-text-secondary)">
                            This notification will be immediately dispatched to the student's notification center and recorded in the Registrar Log audit trail.
                        </p>
                    </div>
                </div>

                <CommonSelect
                    fullWidth
                    label="Notice Template"
                    options={TEMPLATE_OPTIONS}
                    size="small"
                    value={selectedTemplate}
                    onChange={(e) => handleTemplateChange(e.target.value as string)}
                />

                <CommonInput
                    disabled={isSubmitting}
                    fullWidth
                    label="Notification Title"
                    required
                    size="small"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                />

                <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-(--mui-palette-text-secondary)">
                        Message Content <span className="text-red-500">*</span>
                    </label>
                    <textarea
                        className="w-full border border-(--mui-palette-divider) rounded-md p-2.5 text-xs bg-(--mui-palette-background-default) text-(--mui-palette-text-primary) focus:outline-none focus:ring-1 focus:ring-(--mui-palette-primary-main) min-h-[100px] resize-y"
                        disabled={isSubmitting}
                        placeholder="Provide details on the discrepancy or instructions for the student..."
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                    />
                </div>

                <div className="flex gap-2 justify-end mt-2">
                    <CommonButton
                        color="inherit"
                        disabled={isSubmitting}
                        size="small"
                        variant="outlined"
                        onClick={onClose}
                    >
                        Cancel
                    </CommonButton>
                    <CommonButton
                        disabled={isSubmitting || !title.trim() || !message.trim()}
                        size="small"
                        startIcon={<PaperPlaneTiltIcon size={16} />}
                        variant="contained"
                        onClick={handleSend}
                    >
                        {isSubmitting ? 'Sending...' : 'Send Notification'}
                    </CommonButton>
                </div>
            </div>
        </CommonModal>
    );
}
