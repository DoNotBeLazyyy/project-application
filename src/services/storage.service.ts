import { supabase } from '@services/supabase.client';
import { callStorage } from '@services/supabase.wrapper';
import { ServiceResult } from '@type/service.type';
import { parseServiceError } from '@utils/error.util';
import { buildStoragePath, getUploadFileError, UploadFileRules } from '@utils/file.util';

export type StorageBucket = 'logos' | 'avatars' | 'materials' | 'submissions' | 'discussions' | 'announcements' | 'events';

const PUBLIC_BUCKETS: StorageBucket[] = ['logos', 'avatars', 'materials', 'announcements', 'events'];

function isPublicBucket(bucket: StorageBucket): boolean {
    return PUBLIC_BUCKETS.includes(bucket);
}

export interface UploadFileParams {
    bucket: StorageBucket;
    path: string;
    file: File;
    upsert?: boolean;
}

export interface StorageFileUrl {
    url: string;
}

export async function uploadFile({
    bucket,
    path,
    file,
    upsert = false
}: UploadFileParams): Promise<ServiceResult<StorageFileUrl>> {
    return callStorage(async function() {
        const { error } = await supabase.storage
            .from(bucket)
            .upload(path, file, { upsert });

        if (error) {
            return { data: null, error: parseServiceError(error) };
        }

        if (isPublicBucket(bucket)) {
            const { data } = supabase.storage
                .from(bucket)
                .getPublicUrl(path);

            return { data: { url: data.publicUrl }, error: null };
        }

        const { data, error: urlError } = await supabase.storage
            .from(bucket)
            .createSignedUrl(path, 3600);

        if (urlError) {
            return { data: null, error: parseServiceError(urlError) };
        }

        return { data: { url: data.signedUrl }, error: null };
    });
}

export interface UploadToFolderParams extends UploadFileRules {
    bucket: StorageBucket;
    file: File;
    folder: string;
}

export interface UploadedFile {
    file_name: string;
    file_path: string;
    file_size: number;
    mime_type: string | null;
    url: string;
}

/**
 * Checks a file and uploads it under a folder with a safe, unique path. This is the one
 * upload every feature uses, so size, type and name rules are the same everywhere.
 *
 * @param params - Bucket, folder, file and optional size/type rules.
 * @returns The stored file details, or an error saying why it was refused.
 */
export async function uploadFileToFolder({
    allowedExtensions,
    bucket,
    file,
    folder,
    maxSizeMb
}: UploadToFolderParams): Promise<ServiceResult<UploadedFile>> {
    const fileError = getUploadFileError(file, { allowedExtensions, maxSizeMb });
    if (fileError) {
        return { data: null, error: { code: 'INVALID_FILE', message: fileError, status: null } };
    }

    const path = buildStoragePath(folder, file.name);
    const result = await uploadFile({ bucket, file, path });
    if (!result.data) {
        return { data: null, error: result.error };
    }

    return {
        data: {
            file_name: file.name,
            file_path: path,
            file_size: file.size,
            mime_type: file.type || null,
            url: result.data.url
        },
        error: null
    };
}

/**
 * Returns the public storage URL synchronously for public buckets.
 */
export function getPublicStorageUrl(bucket: StorageBucket, path: string): string {
    const { data } = supabase.storage
        .from(bucket)
        .getPublicUrl(path);

    return data.publicUrl;
}

export async function getFileUrl(
    bucket: StorageBucket,
    path: string,
    expiresIn = 3600
): Promise<ServiceResult<StorageFileUrl>> {
    return callStorage(async function() {
        if (isPublicBucket(bucket)) {
            const { data } = supabase.storage
                .from(bucket)
                .getPublicUrl(path);

            return { data: { url: data.publicUrl }, error: null };
        }

        const { data, error } = await supabase.storage
            .from(bucket)
            .createSignedUrl(path, expiresIn);

        if (error) {
            return { data: null, error: parseServiceError(error) };
        }

        return { data: { url: data.signedUrl }, error: null };
    }, { background: true });
}

export async function deleteFile(
    bucket: StorageBucket,
    path: string
): Promise<ServiceResult<null>> {
    return callStorage(async function() {
        const { error } = await supabase.storage
            .from(bucket)
            .remove([path]);

        if (error) {
            return { data: null, error: parseServiceError(error) };
        }

        return { data: null, error: null };
    });
}

export async function listFiles(
    bucket: StorageBucket,
    folder: string
): Promise<ServiceResult<string[]>> {
    return callStorage(async function() {
        const { data, error } = await supabase.storage
            .from(bucket)
            .list(folder);

        if (error) {
            return { data: null, error: parseServiceError(error) };
        }

        return {
            data: data.map((file) => `${folder}/${file.name}`),
            error: null
        };
    }, { background: true });
}