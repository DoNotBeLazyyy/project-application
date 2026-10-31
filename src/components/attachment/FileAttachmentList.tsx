import ImageAttachmentCard from '@components/attachment/ImageAttachmentCard';
import { useAttachmentUrls } from '@components/attachment/use-attachment-urls';
import ImagePreviewModal, { ImagePreviewItem } from '@components/modal/ImagePreviewModal';
import {
    DownloadSimpleIcon,
    FileArchiveIcon,
    FileDocIcon,
    FileIcon,
    FileImageIcon,
    FilePdfIcon,
    FilePptIcon,
    FileXlsIcon,
    SpinnerIcon
} from '@phosphor-icons/react';
import { getFileUrl, StorageBucket } from '@services/storage.service';
import { AttachmentInputDto } from '@type/announcement.type';
import { formatFileSize, isImageFile, triggerFileDownload } from '@utils/file.util';
import React, { useState } from 'react';

export interface FileAttachmentListProps {
    attachments: AttachmentInputDto[];
    bucket?: StorageBucket;
}

function getFileIcon(mimeType: string | null | undefined, fileName: string) {
    if (isImageFile(mimeType ?? null, fileName)) {
        return (
            <FileImageIcon
                className="shrink-0 text-blue-600"
                size={22}
                weight="bold"
            />
        );
    }
    if (fileName.endsWith('.pdf') || mimeType === 'application/pdf') {
        return (
            <FilePdfIcon
                className="shrink-0 text-red-600"
                size={22}
                weight="bold"
            />
        );
    }
    if (/\.(doc|docx)$/i.test(fileName)) {
        return (
            <FileDocIcon
                className="shrink-0 text-blue-700"
                size={22}
                weight="bold"
            />
        );
    }
    if (/\.(xls|xlsx|csv)$/i.test(fileName)) {
        return (
            <FileXlsIcon
                className="shrink-0 text-emerald-600"
                size={22}
                weight="bold"
            />
        );
    }
    if (/\.(ppt|pptx)$/i.test(fileName)) {
        return (
            <FilePptIcon
                className="shrink-0 text-amber-600"
                size={22}
                weight="bold"
            />
        );
    }
    if (/\.(zip|rar|7z|tar|gz)$/i.test(fileName)) {
        return (
            <FileArchiveIcon
                className="shrink-0 text-purple-600"
                size={22}
                weight="bold"
            />
        );
    }

    return (
        <FileIcon
            className="shrink-0 text-slate-500"
            size={22}
            weight="bold"
        />
    );
}

/**
 * FileAttachmentList
 *
 * Renders attachment cards for end-viewers with file type icons, names, and download actions.
 * Image attachments display thumbnail previews directly, which can be clicked to open
 * a zoomable, downloadable, and closable lightbox viewer.
 */
export default function FileAttachmentList({
    attachments,
    bucket = 'materials'
}: FileAttachmentListProps) {
    const [downloadingIndex, setDownloadingIndex] = useState<number | null>(null);
    const [previewModalIndex, setPreviewModalIndex] = useState<number | null>(null);

    const { getUrl } = useAttachmentUrls(attachments, bucket);

    if (!attachments || attachments.length === 0) {
        return null;
    }

    const imageAttachments = attachments.filter((att) => isImageFile(att.mime_type ?? null, att.file_name));
    const otherAttachments = attachments.filter((att) => !isImageFile(att.mime_type ?? null, att.file_name));

    const previewImages: ImagePreviewItem[] = imageAttachments.map((att) => ({
        fileName: att.file_name,
        fileSize: att.file_size,
        url: getUrl(att) || ''
    }));

    async function handleDownload(attachment: AttachmentInputDto, index: number) {
        if (downloadingIndex !== null) {
            return;
        }

        const directUrl = getUrl(attachment);
        if (directUrl) {
            setDownloadingIndex(index);
            try {
                await triggerFileDownload(directUrl, attachment.file_name);
            }
            finally {
                setDownloadingIndex(null);
            }
            return;
        }

        if (!attachment.file_path) {
            return;
        }

        setDownloadingIndex(index);
        try {
            const result = await getFileUrl(bucket, attachment.file_path);
            if (result.data?.url) {
                await triggerFileDownload(result.data.url, attachment.file_name);
            }
        }
        finally {
            setDownloadingIndex(null);
        }
    }

    return (
        <div className="flex flex-col gap-3 w-full">
            {/* Image Attachments with Previews */}
            {imageAttachments.length > 0 && (
                <div className="flex flex-wrap gap-3 w-full">
                    {imageAttachments.map((attachment, imgIndex) => {
                        const previewUrl = getUrl(attachment);
                        return (
                            <ImageAttachmentCard
                                attachment={attachment}
                                disabled
                                key={attachment.file_path || `img-${imgIndex}`}
                                previewUrl={previewUrl}
                                onDownload={() => handleDownload(attachment, imgIndex)}
                                onPreview={() => setPreviewModalIndex(imgIndex)}
                            />
                        );
                    })}
                </div>
            )}

            {/* Other Document Attachments */}
            {otherAttachments.length > 0 && (
                <div className="flex flex-wrap gap-3 w-full">
                    {otherAttachments.map(function(attachment, fileIndex) {
                        const isDownloading = downloadingIndex === fileIndex;

                        return (
                            <div
                                className="bg-(--mui-palette-action-hover)/40 hover:bg-(--mui-palette-action-hover) border border-(--mui-palette-divider) flex group items-center justify-between max-w-full p-2.5 rounded-lg transition-colors w-72"
                                key={attachment.file_path || `doc-${fileIndex}`}
                            >
                                <div
                                    className="cursor-pointer flex flex-1 gap-2.5 items-center min-w-0"
                                    role="button"
                                    tabIndex={0}
                                    title={`Download ${attachment.file_name}`}
                                    onClick={function() {
                                        handleDownload(attachment, fileIndex);
                                    }}
                                    onKeyDown={function(e) {
                                        if (e.key === 'Enter' || e.key === ' ') {
                                            handleDownload(attachment, fileIndex);
                                        }
                                    }}
                                >
                                    <span className="flex items-center justify-center shrink-0">
                                        {getFileIcon(attachment.mime_type, attachment.file_name)}
                                    </span>
                                    <div className="flex flex-col min-w-0">
                                        <span className="font-medium group-hover:text-(--mui-palette-primary-main) text-(--mui-palette-text-primary) text-xs truncate transition-colors">
                                            {attachment.file_name}
                                        </span>
                                        {attachment.file_size !== undefined && attachment.file_size !== null && (
                                            <span className="text-(--mui-palette-text-secondary) text-[11px]">
                                                {formatFileSize(attachment.file_size)}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <button
                                    aria-label={`Download ${attachment.file_name}`}
                                    className="cursor-pointer flex h-8 hover:bg-(--mui-palette-primary-main)/10 hover:text-(--mui-palette-primary-main) items-center justify-center ml-2 rounded-md shrink-0 text-(--mui-palette-text-secondary) transition-colors w-8"
                                    disabled={isDownloading}
                                    title="Download file"
                                    type="button"
                                    onClick={function() {
                                        handleDownload(attachment, fileIndex);
                                    }}
                                >
                                    {isDownloading
                                        ? (
                                            <SpinnerIcon
                                                className="animate-spin text-(--mui-palette-primary-main)"
                                                size={16}
                                            />
                                        )
                                        : (
                                            <DownloadSimpleIcon
                                                size={16}
                                                weight="bold"
                                            />
                                        )}
                                </button>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Image Preview Lightbox Modal */}
            <ImagePreviewModal
                images={previewImages}
                initialIndex={previewModalIndex ?? 0}
                open={previewModalIndex !== null}
                onClose={() => setPreviewModalIndex(null)}
            />
        </div>
    );
}