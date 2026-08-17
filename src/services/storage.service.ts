import { supabase } from '@services/supabase.client';
import { callStorage } from '@services/supabase.wrapper';
import { ServiceResult } from '@type/service.type';
import { parseServiceError } from '@utils/error.util';

export type StorageBucket = 'logos' | 'avatars' | 'materials' | 'submissions';

const PUBLIC_BUCKETS: StorageBucket[] = ['logos', 'avatars'];

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