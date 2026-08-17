import CommonButton from '@components/button/CommonButton';
import { CameraIcon, TrashIcon } from '@phosphor-icons/react';
import { initAuthSession } from '@services/auth.service';
import { updateMyAvatar } from '@services/profile.service';
import { deleteFile, listFiles, uploadFile } from '@services/storage.service';
import { useToastStore } from '@stores/toast.store';
import { ChangeEvent, useRef, useState } from 'react';

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_BYTES = 2 * 1024 * 1024;

interface ProfileAvatarCardProps {
    avatarUrl: string | null;
    initials: string;
    userId: string;
    onChanged: () => void;
}

function resolveExtension(fileName: string, mimeType: string): string {
    const fromName = fileName.split('.')
        .pop()
        ?.toLowerCase();

    if (fromName && /^[a-z0-9]{2,5}$/.test(fromName)) {
        return fromName;
    }

    return mimeType === 'image/png'
        ? 'png'
        : 'jpg';
}

export default function ProfileAvatarCard({
    avatarUrl,
    initials,
    userId,
    onChanged
}: ProfileAvatarCardProps) {
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [isRemoving, setIsRemoving] = useState(false);

    async function removeStoredAvatars(keepPath: string | null) {
        const stored = await listFiles('avatars', userId);

        if (!stored.data) {
            return;
        }

        for (const storedPath of stored.data) {
            if (storedPath !== keepPath) {
                await deleteFile('avatars', storedPath);
            }
        }
    }

    function handleBrowse() {
        fileInputRef.current?.click();
    }

    async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
        const file = event.target.files?.[0];

        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }

        if (!file) {
            return;
        }

        if (!ACCEPTED_TYPES.includes(file.type)) {
            useToastStore.getState()
                .showToast('Choose a JPG, PNG, or WEBP image.', 'warning');
            return;
        }

        if (file.size > MAX_FILE_BYTES) {
            useToastStore.getState()
                .showToast('The image must be 2 MB or smaller.', 'warning');
            return;
        }

        setIsUploading(true);

        const path = `${userId}/avatar.${resolveExtension(file.name, file.type)}`;
        const uploaded = await uploadFile({ bucket: 'avatars', file, path, upsert: true });

        if (!uploaded.data) {
            setIsUploading(false);
            return;
        }

        await removeStoredAvatars(path);

        const result = await updateMyAvatar(`${uploaded.data.url}?v=${Date.now()}`);

        if (!result.error) {
            await initAuthSession();
            onChanged();
        }

        setIsUploading(false);
    }

    async function handleRemove() {
        setIsRemoving(true);

        await removeStoredAvatars(null);

        const result = await updateMyAvatar(null);

        if (!result.error) {
            await initAuthSession();
            onChanged();
        }

        setIsRemoving(false);
    }

    return (
        <div className="flex flex-col gap-4 items-center sm:flex-row sm:items-center">
            {avatarUrl
                ? <img
                    alt="Your profile photo"
                    className="border border-(--mui-palette-divider) h-24 object-cover rounded-full shrink-0 w-24"
                    src={avatarUrl}
                />
                : <span className="bg-(--mui-palette-primary-main) flex font-semibold h-24 items-center justify-center rounded-full shrink-0 text-2xl text-white w-24">
                    {initials}
                </span>}
            <div className="flex flex-col gap-2 items-center sm:items-start">
                <h2 className="font-semibold text-(--mui-palette-text-primary) text-sm">
                    Profile Photo
                </h2>
                <p className="max-w-xs text-(--mui-palette-text-secondary) text-center text-xs sm:text-left">
                    JPG, PNG, or WEBP up to 2 MB. Your photo appears beside your name across the
                    portal.
                </p>
                <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                    <CommonButton
                        disabled={isRemoving}
                        loading={isUploading}
                        size="small"
                        startIcon={<CameraIcon />}
                        variant="contained"
                        onClick={handleBrowse}
                    >
                        {avatarUrl
                            ? 'Change Photo'
                            : 'Upload Photo'}
                    </CommonButton>
                    {avatarUrl && (
                        <CommonButton
                            color="error"
                            disabled={isUploading}
                            loading={isRemoving}
                            size="small"
                            startIcon={<TrashIcon />}
                            variant="outlined"
                            onClick={handleRemove}
                        >
                            Remove
                        </CommonButton>
                    )}
                </div>
            </div>
            <input
                accept={ACCEPTED_TYPES.join(',')}
                className="hidden"
                ref={fileInputRef}
                type="file"
                onChange={handleFileChange}
            />
        </div>
    );
}