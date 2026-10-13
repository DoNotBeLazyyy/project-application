import {
    DownloadSimpleIcon,
    FileImageIcon,
    MagnifyingGlassPlusIcon,
    SpinnerIcon,
    TrashIcon
} from '@phosphor-icons/react';
import { AttachmentInputDto } from '@type/announcement.type';
import { formatFileSize } from '@utils/file.util';
import React from 'react';

export interface ImageAttachmentCardProps {
    attachment: AttachmentInputDto;
    previewUrl?: string;
    disabled?: boolean;
    onPreview: () => void;
    onDownload: () => void;
    onRemove?: () => void;
}

export default function ImageAttachmentCard({
    attachment,
    disabled = false,
    onDownload,
    onPreview,
    onRemove,
    previewUrl
}: ImageAttachmentCardProps) {
    const extension = attachment.file_name.split('.').pop()?.toUpperCase() || 'IMG';

    return (
        <div className="bg-(--mui-palette-background-paper) border border-(--mui-palette-divider) flex flex-col group max-w-full overflow-hidden rounded-xl shadow-xs hover:border-(--mui-palette-primary-main)/40 hover:shadow-md transition-all w-56 sm:w-64">
            {/* Image Preview Container */}
            <div
                aria-label={`Click to enlarge preview of ${attachment.file_name}`}
                className="aspect-video bg-slate-100 dark:bg-zinc-800/80 cursor-pointer flex items-center justify-center overflow-hidden relative w-full"
                role="button"
                tabIndex={0}
                onClick={onPreview}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onPreview();
                    }
                }}
            >
                {previewUrl ? (
                    <>
                        <img
                            alt={attachment.file_name}
                            className="h-full object-cover transition-transform duration-300 w-full group-hover:scale-105"
                            loading="lazy"
                            src={previewUrl}
                        />
                        {/* Hover Overlay */}
                        <div className="absolute bg-black/45 flex gap-1.5 inset-0 items-center justify-center opacity-0 text-white transition-opacity group-hover:opacity-100">
                            <MagnifyingGlassPlusIcon size={20} weight="bold" />
                            <span className="font-semibold text-xs">Click to preview</span>
                        </div>
                    </>
                ) : (
                    <div className="flex flex-col gap-1.5 items-center justify-center p-3 text-(--mui-palette-text-secondary)">
                        <SpinnerIcon className="animate-spin text-(--mui-palette-primary-main)" size={20} />
                        <span className="text-[11px]">Loading preview...</span>
                    </div>
                )}

                {/* Badge Tag */}
                <span className="absolute bg-black/60 backdrop-blur-xs font-semibold left-2 px-1.5 py-0.5 rounded text-[10px] text-white top-2 tracking-wider">
                    {extension}
                </span>
            </div>

            {/* Details & Actions Footer */}
            <div className="bg-(--mui-palette-action-hover)/20 border-(--mui-palette-divider) border-t flex gap-2 items-center justify-between p-2.5">
                <div
                    className="cursor-pointer flex flex-1 flex-col min-w-0"
                    role="button"
                    tabIndex={0}
                    title={attachment.file_name}
                    onClick={onPreview}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            onPreview();
                        }
                    }}
                >
                    <span className="font-medium hover:underline text-(--mui-palette-text-primary) text-xs truncate">
                        {attachment.file_name}
                    </span>
                    {attachment.file_size !== undefined && attachment.file_size !== null && (
                        <span className="text-(--mui-palette-text-secondary) text-[11px]">
                            {formatFileSize(attachment.file_size)}
                        </span>
                    )}
                </div>

                <div className="flex gap-1 items-center ml-1 shrink-0">
                    <button
                        aria-label={`Download ${attachment.file_name}`}
                        className="cursor-pointer flex h-7 hover:bg-black/5 hover:text-(--mui-tokens-color-brand-900) items-center justify-center rounded text-(--mui-palette-text-secondary) transition-colors w-7"
                        title="Download image"
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            onDownload();
                        }}
                    >
                        <DownloadSimpleIcon size={16} weight="bold" />
                    </button>

                    {!disabled && onRemove && (
                        <button
                            aria-label={`Remove ${attachment.file_name}`}
                            className="cursor-pointer flex h-7 hover:bg-red-50 hover:text-(--mui-palette-error-main) items-center justify-center rounded text-(--mui-palette-text-secondary) transition-colors w-7"
                            title="Remove image"
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                onRemove();
                            }}
                        >
                            <TrashIcon size={16} weight="bold" />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
