import { getFileUrl, getPublicStorageUrl, StorageBucket } from '@services/storage.service';
import { AttachmentInputDto } from '@type/announcement.type';
import { isImageFile } from '@utils/file.util';
import { useEffect, useState } from 'react';

const PUBLIC_BUCKETS: StorageBucket[] = ['logos', 'avatars', 'materials', 'announcements', 'events'];

/**
 * useAttachmentUrls
 *
 * Resolves and caches direct/public URLs for attachments stored in Supabase Storage.
 * Ensures image previews can be displayed immediately.
 */
export function useAttachmentUrls(
    attachments: AttachmentInputDto[],
    bucket: StorageBucket = 'materials'
) {
    const [urls, setUrls] = useState<Record<string, string>>({});

    useEffect(() => {
        let active = true;

        async function resolveMissingUrls() {
            const missing = attachments.filter(
                (att) =>
                    att.file_path
                    && !urls[att.file_path]
                    && !att.url
                    && isImageFile(att.mime_type ?? null, att.file_name)
            );

            if (missing.length === 0) return;

            const resolved: Record<string, string> = {};

            await Promise.all(
                missing.map(async(att) => {
                    const res = await getFileUrl(bucket, att.file_path);
                    if (res.data?.url) {
                        resolved[att.file_path] = res.data.url;
                    }
                })
            );

            if (active && Object.keys(resolved).length > 0) {
                setUrls((prev) => ({ ...prev, ...resolved }));
            }
        }

        resolveMissingUrls();

        return () => {
            active = false;
        };
    }, [attachments, bucket]);

    function getUrl(attachment: AttachmentInputDto): string | undefined {
        if (attachment.url) return attachment.url;
        if (!attachment.file_path) return undefined;
        if (urls[attachment.file_path]) return urls[attachment.file_path];
        if (PUBLIC_BUCKETS.includes(bucket)) {
            return getPublicStorageUrl(bucket, attachment.file_path);
        }
        return undefined;
    }

    return { getUrl, urls };
}