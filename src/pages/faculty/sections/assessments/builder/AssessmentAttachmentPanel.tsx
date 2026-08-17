import CommonButton from '@components/button/CommonButton';
import { ArrowLineDownIcon, ArrowLineUpIcon, FileIcon, TrashIcon } from '@phosphor-icons/react';
import { deleteAssessmentAttachment, getAttachmentSignedUrl, uploadAssessmentAttachment } from '@services/assessment.service';
import { AssessmentAttachment } from '@type/assessment.type';
import { useRef, useState } from 'react';

function formatFileSize(bytes: number | null): string {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

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

    async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        const files = Array.from(e.target.files ?? []);
        if (!files.length || !assessmentDbId) return;

        setIsUploading(true);

        try {
            await Promise.all(
                files.map((file) => uploadAssessmentAttachment(assessmentDbId, file))
            );
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

        const a = document.createElement('a');
        a.href = result.data;
        a.download = attachment.file_name;
        a.target = '_blank';
        a.click();
    }

    async function handleDelete(attachmentId: string) {
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
                    startIcon={<ArrowLineUpIcon size={14} weight="bold" />}
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
                            <ArrowLineDownIcon size={13} weight="bold" />
                        </CommonButton>
                        <CommonButton
                            color="error"
                            size="small"
                            onClick={function() {
                                handleDelete(attachment.id);
                            }}
                        >
                            <TrashIcon size={13} weight="bold" />
                        </CommonButton>
                    </div>
                ))}
            </div>
        </div>
    );
}