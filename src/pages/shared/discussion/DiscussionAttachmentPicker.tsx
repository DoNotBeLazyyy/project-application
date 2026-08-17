import CommonButton from '@components/button/CommonButton';
import { FileIcon, PaperclipIcon, XIcon } from '@phosphor-icons/react';
import { formatFileSize } from '@utils/file.util';
import { ChangeEvent, useEffect, useRef, useState } from 'react';

interface DiscussionAttachmentPickerProps {
    files: File[];
    isDisabled?: boolean;
    onAdd: (files: File[]) => void;
    onRemove: (index: number) => void;
}

interface PendingAttachmentChipProps {
    file: File;
    isDisabled?: boolean;
    onRemove: () => void;
}

function PendingAttachmentChip({ file, isDisabled, onRemove }: PendingAttachmentChipProps) {
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    useEffect(function() {
        if (!file.type.startsWith('image/')) {
            return;
        }

        const url = URL.createObjectURL(file);
        setPreviewUrl(url);

        return function() {
            URL.revokeObjectURL(url);
        };
    }, [file]);

    return (
        <div className="flex gap-2 items-center rounded-lg border border-(--mui-palette-divider) px-2 py-1">
            {previewUrl
                ? (
                    <img
                        alt={file.name}
                        className="h-8 object-cover rounded w-8"
                        src={previewUrl}
                    />
                )
                : (
                    <FileIcon
                        className="text-(--mui-palette-text-secondary)"
                        size={16}
                    />
                )}
            <span className="max-w-40 text-(--mui-palette-text-primary) text-xs truncate">
                {file.name}
            </span>
            <span className="text-(--mui-palette-text-disabled) text-xs">
                {formatFileSize(file.size)}
            </span>
            <button
                className="flex items-center text-(--mui-palette-text-secondary)"
                disabled={isDisabled}
                type="button"
                onClick={onRemove}
            >
                <XIcon size={14} />
            </button>
        </div>
    );
}

export default function DiscussionAttachmentPicker({
    files,
    isDisabled,
    onAdd,
    onRemove
}: DiscussionAttachmentPickerProps) {
    const inputRef = useRef<HTMLInputElement>(null);

    function handleSelect(event: ChangeEvent<HTMLInputElement>) {
        const selected = Array.from(event.target.files ?? []);

        if (selected.length > 0) {
            onAdd(selected);
        }

        event.target.value = '';
    }

    return (
        <div className="flex flex-col gap-2">
            <div className="flex gap-2 items-center">
                <input
                    className="hidden"
                    multiple
                    ref={inputRef}
                    type="file"
                    onChange={handleSelect}
                />
                <CommonButton
                    color="inherit"
                    disabled={isDisabled}
                    size="small"
                    startIcon={<PaperclipIcon size={16} />}
                    variant="outlined"
                    onClick={function() {
                        inputRef.current?.click();
                    }}
                >
                    Attach files
                </CommonButton>
                <span className="text-(--mui-palette-text-disabled) text-xs">
                    You can also paste images or files directly into the message box.
                </span>
            </div>
            {files.length > 0 && (
                <div className="flex flex-wrap gap-2">
                    {files.map(function(file, index) {
                        return (
                            <PendingAttachmentChip
                                file={file}
                                isDisabled={isDisabled}
                                key={`${file.name}_${index}`}
                                onRemove={function() {
                                    onRemove(index);
                                }}
                            />
                        );
                    })}
                </div>
            )}
        </div>
    );
}