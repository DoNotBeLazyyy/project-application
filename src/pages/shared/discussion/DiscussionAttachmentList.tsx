import { DownloadSimpleIcon, FileIcon } from '@phosphor-icons/react';
import { getDiscussionFileUrl } from '@services/discussion.service';
import { DiscussionAttachment } from '@type/discussion.type';
import { formatFileSize, isImageFile } from '@utils/file.util';
import { useEffect, useState } from 'react';

interface DiscussionAttachmentListProps {
    attachments: DiscussionAttachment[];
}

export default function DiscussionAttachmentList({ attachments }: DiscussionAttachmentListProps) {
    const [urlByPath, setUrlByPath] = useState<Record<string, string>>({});

    useEffect(function() {
        let isActive = true;

        async function loadUrls() {
            const entries = await Promise.all(attachments.map(async function(attachment) {
                const result = await getDiscussionFileUrl(attachment.file_path);

                return [attachment.file_path, result.data ?? ''] as const;
            }));

            if (!isActive) {
                return;
            }

            setUrlByPath(Object.fromEntries(entries.filter(function(entry) {
                return entry[1] !== '';
            })));
        }

        if (attachments.length > 0) {
            loadUrls();
        }

        return function() {
            isActive = false;
        };
    }, [attachments]);

    if (attachments.length === 0) {
        return null;
    }

    return (
        <div className="flex flex-wrap gap-2">
            {attachments.map(function(attachment) {
                const url = urlByPath[attachment.file_path];
                const isImage = isImageFile(attachment.mime_type, attachment.file_name);

                if (isImage && url) {
                    return (
                        <a
                            className="block max-w-64 overflow-hidden rounded-lg border border-(--mui-palette-divider)"
                            href={url}
                            key={attachment.id}
                            rel="noreferrer"
                            target="_blank"
                        >
                            <img
                                alt={attachment.file_name}
                                className="h-auto max-h-64 object-contain w-full"
                                src={url}
                            />
                        </a>
                    );
                }

                return (
                    <a
                        className="flex gap-2 items-center rounded-lg border border-(--mui-palette-divider) px-3 py-2 hover:bg-black/5"
                        href={url ?? '#'}
                        key={attachment.id}
                        rel="noreferrer"
                        target="_blank"
                    >
                        <FileIcon
                            className="text-(--mui-palette-text-secondary)"
                            size={18}
                        />
                        <span className="max-w-56 text-(--mui-palette-text-primary) text-xs truncate">
                            {attachment.file_name}
                        </span>
                        <span className="text-(--mui-palette-text-disabled) text-xs">
                            {formatFileSize(attachment.file_size)}
                        </span>
                        <DownloadSimpleIcon
                            className="text-(--mui-palette-text-secondary)"
                            size={16}
                        />
                    </a>
                );
            })}
        </div>
    );
}