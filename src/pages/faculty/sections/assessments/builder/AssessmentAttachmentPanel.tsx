import CommonButton from '@components/button/CommonButton';
import DeletePromptModal from '@components/modal/DeletePromptModal';
import { ArrowLineDownIcon, ArrowLineUpIcon, FileIcon, TrashIcon } from '@phosphor-icons/react';
import { deleteAssessmentAttachment, getAttachmentSignedUrl, uploadAssessmentAttachment } from '@services/assessment.service';
import { useToastStore } from '@stores/toast.store';
import { AssessmentAttachment } from '@type/assessment.type';
import { formatFileSize, triggerFileDownload } from '@utils/file.util';
import { useRef, useState } from 'react';

interface AssessmentAttachmentPanelProps {
    assessmentDbId: string;
    attachments: AssessmentAttachment[];
    onAttachmentsChange: () => Promise<void>;
}

export default function AssessmentAttachmentPanel({
    assessmentDbId,
    attachments,
    onAttachmentsChange
}: AssessmentAttachmentPanelProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [pendingDelete, setPendingDelete] = useState<AssessmentAttachment | null>(null);

    async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        const files = Array.from(e.target.files ?? []);
        if (!files.length || !assessmentDbId) return;

        setIsUploading(true);

        try {
            const results = await Promise.all(
                files.map((file) => uploadAssessmentAttachment(assessmentDbId, file))
            );

            // Refused files (empty, too large, program files) are not toasted by the upload itself
            const refusedMessages = results
                .filter((result) => result.error?.code === 'INVALID_FILE')
                .map((result) => result.error?.message);
            if (refusedMessages.length > 0) {
                useToastStore.getState()
                    .showToast(refusedMessages.join(' '), 'error');
            }

            await onAttachmentsChange();
        }
        finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    }

    async function handleDownload(attachment: AssessmentAttachment) {
        const result = await getAttachmentSignedUrl(attachment.file_url);

        if (!result.data) {
            return;
        }

        await triggerFileDownload(result.data, attachment.file_name);
    }

    async function handleConfirmDelete() {
        if (!pendingDelete) return;
        const attachmentId = pendingDelete.id;
        setPendingDelete(null);
        const result = await deleteAssessmentAttachment(attachmentId);
        if (!result.error) await onAttachmentsChange();
    }

    return (
        <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
                <span className="font-medium text-(--mui-palette-text-primary) text-sm">
                    Attachments
                </span>
                <CommonButton
                    disabled={!assessmentDbId || isUploading}
                    size="small"
                    startIcon={(
                        <ArrowLineUpIcon
                            size={14}
                            weight="bold"
                        />
                    )}
                    variant="outlined"
                    onClick={function() {
                        fileInputRef.current?.click();
                    }}
                >
                    {isUploading
                        ? 'Uploading...'
                        : 'Upload Files'}
                </CommonButton>
                <input
                    className="hidden"
                    multiple
                    ref={fileInputRef}
                    type="file"
                    onChange={handleFileChange}
                />
            </div>
            {!assessmentDbId && (
                <p className="text-(--mui-palette-text-secondary) text-xs">
                    Save the assessment settings first to upload attachments.
                </p>
            )}
            {attachments.length === 0 && assessmentDbId && (
                <p className="text-(--mui-palette-text-secondary) text-xs">
                    No attachments yet.
                </p>
            )}
            <div className="flex flex-col gap-2">
                {attachments.map((attachment) => (
                    <div
                        className="border border-(--mui-palette-divider) flex gap-2 items-center p-2 rounded-lg"
                        key={attachment.id}
                    >
                        <FileIcon
                            className="flex-shrink-0 text-(--mui-palette-text-secondary)"
                            size={16}
                            weight="bold"
                        />
                        <div className="flex flex-1 flex-col min-w-0">
                            <span className="text-(--mui-palette-text-primary) text-xs truncate">
                                {attachment.file_name}
                            </span>
                            <span className="text-(--mui-palette-text-secondary) text-xs">
                                {formatFileSize(attachment.file_size_bytes)}
                            </span>
                        </div>
                        <CommonButton
                            color="primary"
                            size="small"
                            onClick={function() {
                                handleDownload(attachment);
                            }}
                        >
                            <ArrowLineDownIcon
                                size={13}
                                weight="bold"
                            />
                        </CommonButton>
                        <CommonButton
                            color="error"
                            size="small"
                            onClick={function() {
                                setPendingDelete(attachment);
                            }}
                        >
                            <TrashIcon
                                size={13}
                                weight="bold"
                            />
                        </CommonButton>
                    </div>
                ))}
            </div>
            <DeletePromptModal
                formButtonsProps={{
                    cancelProps: { onClick: () => setPendingDelete(null) },
                    confirmProps: { onClick: handleConfirmDelete }
                }}
                mainContent={{ title: 'Delete this attachment?' }}
                open={pendingDelete !== null}
                subContent={{ title: `${pendingDelete?.file_name ?? 'The file'} will be removed from this assessment.` }}
                onClose={() => setPendingDelete(null)}
            />
        </div>
    );
}