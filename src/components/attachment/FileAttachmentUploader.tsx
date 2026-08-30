import CommonButton from '@components/button/CommonButton';
import {
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
import { StorageBucket, uploadFile } from '@services/storage.service';
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
        return <FileImageIcon className="text-blue-600" size={20} weight="bold" />;
    }
    if (fileName.endsWith('.pdf') || mimeType === 'application/pdf') {
        return <FilePdfIcon className="text-red-600" size={20} weight="bold" />;
    }
    if (/\.(doc|docx)$/i.test(fileName)) {
        return <FileDocIcon className="text-blue-700" size={20} weight="bold" />;
    }
    if (/\.(xls|xlsx|csv)$/i.test(fileName)) {
        return <FileXlsIcon className="text-emerald-600" size={20} weight="bold" />;
    }
    if (/\.(ppt|pptx)$/i.test(fileName)) {
        return <FilePptIcon className="text-amber-600" size={20} weight="bold" />;
    }
    if (/\.(zip|rar|7z|tar|gz)$/i.test(fileName)) {
        return <FileArchiveIcon className="text-purple-600" size={20} weight="bold" />;
    }

    return <FileIcon className="text-slate-500" size={20} weight="bold" />;
}

/**
 * FileAttachmentUploader
 *
 * Reusable file attachment dropzone and manager that uploads files to
 * Supabase Storage and updates attachment records in form state.
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

                <CommonButton
                    color="inherit"
                    disabled={disabled || isUploading}
                    size="small"
                    startIcon={<UploadSimpleIcon weight="bold" />}
                    variant="outlined"
                    onClick={() => fileInputRef.current?.click()}
                >
                    {isUploading
                        ? 'Uploading...'
                        : 'Attach Files'}
                </CommonButton>

                <input
                    aria-label="Upload files"
                    className="hidden"
                    disabled={disabled || isUploading}
                    multiple
                    ref={fileInputRef}
                    type="file"
                    onChange={handleFileChange}
                />
            </div>

            {/* Drag and Drop Zone */}
            <div
                className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors cursor-pointer ${
                    isDragging
                        ? 'border-(--mui-tokens-color-brand-900) bg-(--mui-tokens-color-brand-50)'
                        : 'border-(--mui-palette-divider) hover:border-(--mui-palette-text-secondary) bg-(--mui-palette-background-paper)'
                } ${disabled
                    ? 'opacity-50 pointer-events-none'
                    : ''}`}
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

            {uploadError && (
                <span className="text-(--mui-palette-error-main) text-xs">
                    {uploadError}
                </span>
            )}

            {/* Attached Files List */}
            {attachments.length > 0 && (
                <div className="flex flex-col gap-2 pt-1">
                    {attachments.map((attachment, index) => (
                        <div
                            className="bg-(--mui-palette-action-hover) border border-(--mui-palette-divider) flex items-center justify-between px-3 py-2 rounded-lg"
                            key={attachment.file_path || index}
                        >
                            <div className="flex gap-2.5 items-center min-w-0">
                                {getFileIcon(attachment.mime_type, attachment.file_name)}
                                <div className="flex flex-col min-w-0">
                                    <span className="font-medium max-w-xs md:max-w-md text-(--mui-palette-text-primary) text-xs truncate">
                                        {attachment.file_name}
                                    </span>
                                    {attachment.file_size !== undefined && attachment.file_size !== null && (
                                        <span className="text-(--mui-palette-text-secondary) text-[11px]">
                                            {formatFileSize(attachment.file_size)}
                                        </span>
                                    )}
                                </div>
                            </div>

                            {!disabled && (
                                <button
                                    aria-label="Remove attachment"
                                    className="hover:bg-black/5 hover:text-(--mui-palette-error-main) p-1 rounded text-(--mui-palette-text-secondary) transition-colors"
                                    type="button"
                                    onClick={() => handleRemove(index)}
                                >
                                    <TrashIcon size={16} weight="bold" />
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}