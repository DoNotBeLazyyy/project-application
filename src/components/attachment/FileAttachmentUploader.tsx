import {
    DownloadSimpleIcon,
    FileArchiveIcon,
    FileDocIcon,
    FileIcon,
    FileImageIcon,
    FilePdfIcon,
    FilePptIcon,
    FileXlsIcon,
    PaperclipIcon,
    TrashIcon,
    UploadSimpleIcon
} from '@phosphor-icons/react';
import { getFileUrl, StorageBucket, uploadFile } from '@services/storage.service';
import { AttachmentInputDto } from '@type/announcement.type';
import { formatFileSize, isImageFile } from '@utils/file.util';
import { ChangeEvent, DragEvent, useRef, useState } from 'react';

export interface FileAttachmentUploaderProps {
    attachments: AttachmentInputDto[];
    disabled?: boolean;
    bucket?: StorageBucket;
    folderPrefix?: string;
    maxFileSizeMb?: number;
    onChange: (attachments: AttachmentInputDto[]) => void;
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
 * FileAttachmentUploader
 *
 * Reusable file attachment dropzone and manager that uploads files to
 * Supabase Storage and presents attachments as compact fixed-width cards.
 */
export default function FileAttachmentUploader({
    attachments,
    bucket = 'materials',
    disabled = false,
    folderPrefix = 'attachments',
    maxFileSizeMb = 25,
    onChange
}: FileAttachmentUploaderProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);

    async function handleUploadFiles(files: FileList | File[]) {
        if (files.length === 0 || disabled) {
            return;
        }

        setUploadError(null);
        setIsUploading(true);

        const newAttachments: AttachmentInputDto[] = [...attachments];

        for (const file of Array.from(files)) {
            if (file.size > maxFileSizeMb * 1024 * 1024) {
                setUploadError(`File "${file.name}" exceeds the maximum limit of ${maxFileSizeMb}MB.`);
                continue;
            }

            const timestamp = Date.now();
            const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
            const path = `${folderPrefix}/${timestamp}-${sanitizedName}`;

            const result = await uploadFile({
                bucket,
                file,
                path
            });

            if (result.data) {
                newAttachments.push({
                    file_name: file.name,
                    file_path: path,
                    file_size: file.size,
                    mime_type: file.type || null
                });
            }
            else if (result.error) {
                setUploadError(result.error.message || `Failed to upload "${file.name}".`);
            }
        }

        setIsUploading(false);
        onChange(newAttachments);

        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    }

    function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
        if (event.target.files) {
            handleUploadFiles(event.target.files);
        }
    }

    function handleDragOver(event: DragEvent<HTMLDivElement>) {
        event.preventDefault();
        event.stopPropagation();
        if (!disabled) {
            setIsDragging(true);
        }
    }

    function handleDragLeave(event: DragEvent<HTMLDivElement>) {
        event.preventDefault();
        event.stopPropagation();
        setIsDragging(false);
    }

    function handleDrop(event: DragEvent<HTMLDivElement>) {
        event.preventDefault();
        event.stopPropagation();
        setIsDragging(false);

        if (event.dataTransfer.files) {
            handleUploadFiles(event.dataTransfer.files);
        }
    }

    function handleRemove(indexToRemove: number) {
        if (disabled) {
            return;
        }

        const filtered = attachments.filter((_, idx) => idx !== indexToRemove);
        onChange(filtered);
    }

    async function handleDownloadFile(attachment: AttachmentInputDto) {
        if (!attachment.file_path) {
            return;
        }

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
    }

    return (
        <div className="flex flex-col gap-3 w-full">
            <div className="flex items-center justify-between">
                <span className="flex font-medium gap-2 items-center text-(--mui-palette-text-primary) text-sm">
                    <PaperclipIcon size={18} weight="bold" />
                    <span>Attachments</span>
                    <span className="font-normal text-(--mui-palette-text-secondary) text-xs">
                        ({attachments.length})
                    </span>
                </span>

                {!disabled && (
                    <input
                        aria-label="Upload files"
                        className="hidden"
                        disabled={isUploading}
                        multiple
                        ref={fileInputRef}
                        type="file"
                        onChange={handleFileChange}
                    />
                )}
            </div>

            {/* Drag and Drop Zone - Only in Edit/Create Mode */}
            {!disabled && (
                <div
                    className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors cursor-pointer ${
                        isDragging
                            ? 'border-(--mui-tokens-color-brand-900) bg-(--mui-tokens-color-brand-50)'
                            : 'border-(--mui-palette-divider) hover:border-(--mui-palette-text-secondary) bg-(--mui-palette-background-paper)'
                    }`}
                    onClick={() => fileInputRef.current?.click()}
                    onDragLeave={handleDragLeave}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                >
                    <div className="flex flex-col gap-1.5 items-center pointer-events-none">
                        <UploadSimpleIcon
                            className="text-(--mui-palette-text-secondary)"
                            size={24}
                            weight="regular"
                        />
                        <p className="text-(--mui-palette-text-secondary) text-xs">
                            <span className="font-medium text-(--mui-tokens-color-brand-900)">
                                Click to upload
                            </span>{' '}
                            or drag and drop files here
                        </p>
                        <p className="text-(--mui-palette-text-disabled) text-[11px]">
                            PDF, DOCX, XLSX, Images, ZIP up to {maxFileSizeMb}MB
                        </p>
                    </div>
                </div>
            )}

            {/* Read-Only Empty State */}
            {disabled && attachments.length === 0 && (
                <div className="bg-(--mui-palette-action-hover)/40 border border-(--mui-palette-divider) p-4 rounded-lg">
                    <span className="italic text-(--mui-palette-text-secondary) text-sm">
                        No attachments provided.
                    </span>
                </div>
            )}

            {uploadError && (
                <span className="text-(--mui-palette-error-main) text-xs">
                    {uploadError}
                </span>
            )}

            {/* Attached Files List - Fixed-width compact cards */}
            {attachments.length > 0 && (
                <div className="flex flex-wrap gap-2.5 pt-1 w-full">
                    {attachments.map((attachment, index) => (
                        <div
                            className="bg-(--mui-palette-action-hover) border border-(--mui-palette-divider) flex items-center justify-between max-w-full p-2.5 rounded-lg transition-colors w-72"
                            key={attachment.file_path || index}
                        >
                            <div
                                className="cursor-pointer flex flex-1 gap-2.5 items-center min-w-0"
                                role="button"
                                tabIndex={0}
                                title={`Download ${attachment.file_name}`}
                                onClick={() => handleDownloadFile(attachment)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        handleDownloadFile(attachment);
                                    }
                                }}
                            >
                                <span className="flex items-center justify-center shrink-0">
                                    {getFileIcon(attachment.mime_type, attachment.file_name)}
                                </span>
                                <div className="flex flex-col min-w-0">
                                    <span className="font-medium hover:underline text-(--mui-palette-text-primary) text-xs truncate">
                                        {attachment.file_name}
                                    </span>
                                    {attachment.file_size !== undefined && attachment.file_size !== null && (
                                        <span className="text-(--mui-palette-text-secondary) text-[11px]">
                                            {formatFileSize(attachment.file_size)}
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div className="flex gap-1 items-center ml-2 shrink-0">
                                <button
                                    aria-label="Download file"
                                    className="cursor-pointer flex h-7 hover:bg-black/5 hover:text-(--mui-tokens-color-brand-900) items-center justify-center rounded text-(--mui-palette-text-secondary) transition-colors w-7"
                                    title="Download file"
                                    type="button"
                                    onClick={() => handleDownloadFile(attachment)}
                                >
                                    <DownloadSimpleIcon size={16} weight="bold" />
                                </button>
                                {!disabled && (
                                    <button
                                        aria-label="Remove attachment"
                                        className="cursor-pointer flex h-7 hover:bg-red-50 hover:text-(--mui-palette-error-main) items-center justify-center rounded text-(--mui-palette-text-secondary) transition-colors w-7"
                                        title="Remove attachment"
                                        type="button"
                                        onClick={() => handleRemove(index)}
                                    >
                                        <TrashIcon size={16} weight="bold" />
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}