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
import { formatFileSize, isImageFile } from '@utils/file.util';
import { useState } from 'react';

export interface FileAttachmentListProps {
    attachments: AttachmentInputDto[];
    bucket?: StorageBucket;
}

function getFileIcon(mimeType: string | null | undefined, fileName: string) {
    if (isImageFile(mimeType ?? null, fileName)) {
        return <FileImageIcon className="shrink-0 text-blue-600" size={22} weight="bold" />;
    }
    if (fileName.endsWith('.pdf') || mimeType === 'application/pdf') {
        return <FilePdfIcon className="shrink-0 text-red-600" size={22} weight="bold" />;
    }
    if (/\.(doc|docx)$/i.test(fileName)) {
        return <FileDocIcon className="shrink-0 text-blue-700" size={22} weight="bold" />;
    }
    if (/\.(xls|xlsx|csv)$/i.test(fileName)) {
        return <FileXlsIcon className="shrink-0 text-emerald-600" size={22} weight="bold" />;
    }
    if (/\.(ppt|pptx)$/i.test(fileName)) {
        return <FilePptIcon className="shrink-0 text-amber-600" size={22} weight="bold" />;
    }
    if (/\.(zip|rar|7z|tar|gz)$/i.test(fileName)) {
        return <FileArchiveIcon className="shrink-0 text-purple-600" size={22} weight="bold" />;
    }

    return <FileIcon className="shrink-0 text-slate-500" size={22} weight="bold" />;
}

/**
 * FileAttachmentList
 *
 * Renders a clean list of downloadable attachment cards with file type icons,
 * file names, human-readable file sizes, and download actions.
 */
export default function FileAttachmentList({
    attachments,
    bucket = 'materials'
}: FileAttachmentListProps) {
    const [downloadingIndex, setDownloadingIndex] = useState<number | null>(null);

    if (!attachments || attachments.length === 0) {
        return null;
    }

    async function handleDownload(attachment: AttachmentInputDto, index: number) {
        if (!attachment.file_path || downloadingIndex !== null) {
            return;
        }

        setDownloadingIndex(index);
        try {
            const result = await getFileUrl(bucket, attachment.file_path);

            if (result.data?.url) {
                const link = document.createElement('a');
                link.href = result.data.url;
                link.download = attachment.file_name || 'download';
                link.target = '_blank';
                link.rel = 'noopener noreferrer';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            }
        } finally {
            setDownloadingIndex(null);
        }
    }

    return (
        <div className="flex flex-wrap gap-3 w-full">
            {attachments.map(function(attachment, index) {
                const isDownloading = downloadingIndex === index;

                return (
                    <div
                        className="bg-(--mui-palette-action-hover)/40 hover:bg-(--mui-palette-action-hover) border border-(--mui-palette-divider) flex group items-center justify-between max-w-full p-2.5 rounded-lg transition-colors w-72"
                        key={attachment.file_path || index}
                    >
                        <div
                            className="cursor-pointer flex flex-1 gap-2.5 items-center min-w-0"
                            role="button"
                            tabIndex={0}
                            title={`Download ${attachment.file_name}`}
                            onClick={function() {
                                handleDownload(attachment, index);
                            }}
                            onKeyDown={function(e) {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    handleDownload(attachment, index);
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
                                handleDownload(attachment, index);
                            }}
                        >
                            {isDownloading ? (
                                <SpinnerIcon className="animate-spin text-(--mui-palette-primary-main)" size={16} />
                            ) : (
                                <DownloadSimpleIcon size={16} weight="bold" />
                            )}
                        </button>
                    </div>
                );
            })}
        </div>
    );
}
