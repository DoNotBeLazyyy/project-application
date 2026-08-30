import {
    DownloadSimpleIcon,
    FileArchiveIcon,
    FileDocIcon,
    FileIcon,
    FileImageIcon,
    FilePdfIcon,
    FilePptIcon,
    FileXlsIcon
} from '@phosphor-icons/react';
import { getFileUrl, StorageBucket } from '@services/storage.service';
import { formatFileSize, isImageFile } from '@utils/file.util';
import { useEffect, useState } from 'react';

export interface AttachmentItem {
    id?: string;
    file_name: string;
    file_path: string;
    mime_type?: string | null;
    file_size?: number | null;
}

export interface FileAttachmentListProps {
    attachments: AttachmentItem[];
    bucket?: StorageBucket;
}

function getFileIcon(mimeType: string | null | undefined, fileName: string) {
    if (isImageFile(mimeType ?? null, fileName)) {
        return <FileImageIcon className="text-blue-600" size={18} weight="bold" />;
    }
    if (fileName.endsWith('.pdf') || mimeType === 'application/pdf') {
        return <FilePdfIcon className="text-red-600" size={18} weight="bold" />;
    }
    if (/\.(doc|docx)$/i.test(fileName)) {
        return <FileDocIcon className="text-blue-700" size={18} weight="bold" />;
    }
    if (/\.(xls|xlsx|csv)$/i.test(fileName)) {
        return <FileXlsIcon className="text-emerald-600" size={18} weight="bold" />;
    }
    if (/\.(ppt|pptx)$/i.test(fileName)) {
        return <FilePptIcon className="text-amber-600" size={18} weight="bold" />;
    }
    if (/\.(zip|rar|7z|tar|gz)$/i.test(fileName)) {
        return <FileArchiveIcon className="text-purple-600" size={18} weight="bold" />;
    }

    return <FileIcon className="text-slate-500" size={18} weight="bold" />;
}

/**
 * FileAttachmentList
 *
 * Renders attached files in view/read mode with file type icons, formatted file sizes,
 * and direct download/preview links.
 */
export default function FileAttachmentList({
    attachments,
    bucket = 'materials'
}: FileAttachmentListProps) {
    const [urlByPath, setUrlByPath] = useState<Record<string, string>>({});

    useEffect(() => {
        let isActive = true;

        async function loadUrls() {
            const entries = await Promise.all(
                attachments.map(async(attachment) => {
                    const result = await getFileUrl(bucket, attachment.file_path);
                    return [attachment.file_path, result.data?.url ?? ''] as const;
                })
            );

            if (!isActive) {
                return;
            }

            setUrlByPath(
                Object.fromEntries(entries.filter((entry) => entry[1] !== ''))
            );
        }

        if (attachments.length > 0) {
            loadUrls();
        }

        return () => {
            isActive = false;
        };
    }, [attachments, bucket]);

    if (attachments.length === 0) {
        return null;
    }

    return (
        <div className="flex flex-col gap-2 w-full">
            <span className="font-semibold text-(--mui-palette-text-secondary) text-xs tracking-wider uppercase">
                Attachments ({attachments.length})
            </span>
            <div className="flex flex-wrap gap-2.5">
                {attachments.map((attachment, idx) => {
                    const url = urlByPath[attachment.file_path];
                    const isImg = isImageFile(attachment.mime_type ?? null, attachment.file_name);

                    if (isImg && url) {
                        return (
                            <a
                                className="block border border-(--mui-palette-divider) group hover:border-(--mui-tokens-color-brand-900) max-w-56 overflow-hidden relative rounded-lg transition-colors"
                                href={url}
                                key={attachment.id || attachment.file_path || idx}
                                rel="noreferrer"
                                target="_blank"
                            >
                                <img
                                    alt={attachment.file_name}
                                    className="duration-200 group-hover:scale-105 h-28 object-cover transition-transform w-full"
                                    src={url}
                                />
                                <div className="absolute bg-gradient-to-t bottom-0 flex from-black/70 inset-x-0 items-center justify-between p-1.5 text-white to-transparent">
                                    <span className="max-w-36 text-[11px] truncate">
                                        {attachment.file_name}
                                    </span>
                                    <DownloadSimpleIcon size={14} weight="bold" />
                                </div>
                            </a>
                        );
                    }

                    return (
                        <a
                            className="bg-(--mui-palette-background-paper) border border-(--mui-palette-divider) flex font-medium gap-2.5 hover:bg-(--mui-tokens-color-brand-50) hover:border-(--mui-tokens-color-brand-900) items-center px-3 py-2 rounded-lg shadow-xs text-(--mui-palette-text-primary) text-xs transition-all"
                            href={url || '#'}
                            key={attachment.id || attachment.file_path || idx}
                            rel="noreferrer"
                            target="_blank"
                        >
                            {getFileIcon(attachment.mime_type, attachment.file_name)}
                            <span className="font-medium max-w-xs truncate">
                                {attachment.file_name}
                            </span>
                            {attachment.file_size !== undefined && attachment.file_size !== null && (
                                <span className="text-(--mui-palette-text-secondary) text-[11px]">
                                    ({formatFileSize(attachment.file_size)})
                                </span>
                            )}
                            <DownloadSimpleIcon
                                className="group-hover:text-(--mui-tokens-color-brand-900) ml-1 shrink-0 text-(--mui-palette-text-secondary)"
                                size={14}
                                weight="bold"
                            />
                        </a>
                    );
                })}
            </div>
        </div>
    );
}