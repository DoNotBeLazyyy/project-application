import CommonButton from '@components/button/CommonButton';
import CommonCard from '@components/card/CommonCard';
import CommonForm from '@components/form/CommonForm';
import { FormFieldConfig } from '@components/form/FormField';
import CommonInfoTooltip from '@components/tooltip/CommonInfoTooltip';
import { useHasRealChanges } from '@hooks/use-has-real-changes';
import {
    CameraIcon,
    InfoIcon,
    TrashIcon,
    WarningCircleIcon
} from '@phosphor-icons/react';
import { deleteFile, uploadFile } from '@services/storage.service';
import { getSystemSettings, updateSystemSettings } from '@services/system-settings.service';
import { useToastStore } from '@stores/toast.store';
import { SystemSettingsFormValues } from '@type/system-settings.type';
import { formErrors } from '@utils/form.util';
import { useEffect, useRef, useState } from 'react';
import { FieldErrors, useForm } from 'react-hook-form';

const SETTINGS_FORM_ID = 'system-settings-form';
const LOGO_BUCKET = 'logos';
const LOGO_MAX_BYTES = 2 * 1024 * 1024;
const LOGO_TYPES: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/svg+xml': 'svg',
    'image/webp': 'webp'
};

/**
 * Finds the storage path of a logo we uploaded, from its public URL.
 * Returns null for any other URL, so outside images are never deleted.
 */
function getLogoStoragePath(url: string | null | undefined): string | null {
    if (!url) {
        return null;
    }
    const marker = `/object/public/${LOGO_BUCKET}/`;
    const index = url.indexOf(marker);
    if (index === -1) {
        return null;
    }
    const path = url.slice(index + marker.length)
        .split('?')[0];
    return path
        ? decodeURIComponent(path)
        : null;
}

export default function SystemSettings() {
    const [isLoading, setIsLoading] = useState(true);
    const [hasData, setHasData] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [logoPreview, setLogoPreview] = useState<string | null>(null);
    // The chosen logo is only uploaded when the settings are saved
    const [pendingLogoFile, setPendingLogoFile] = useState<File | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const localPreviewUrlRef = useRef<string | null>(null);
    const methods = useForm<SystemSettingsFormValues>({
        defaultValues: {
            institution_name: '',
            institution_short_name: '',
            institution_address: '',
            institution_email: '',
            institution_phone: '',
            institution_mobile: '',
            institution_website: '',
            institution_logo_url: '',
            academic_year_start_month: '6'
        }
    });
    const hasRealChanges = useHasRealChanges(methods.control);

    useEffect(function() {
        async function loadSettings() {
            const result = await getSystemSettings();

            if (result.error) {
                // A failed load must not look like "nothing saved yet", or Save would overwrite real settings
                setLoadError(result.error.message || 'The system settings could not be loaded.');
            }
            else if (result.data) {
                setHasData(true);
                methods.reset({
                    institution_name: result.data.institution_name,
                    institution_short_name: result.data.institution_short_name,
                    institution_address: result.data.institution_address,
                    institution_email: result.data.institution_email,
                    institution_phone: result.data.institution_phone,
                    institution_mobile: result.data.institution_mobile ?? '',
                    institution_website: result.data.institution_website,
                    institution_logo_url: result.data.institution_logo_url,
                    // Not edited here, but carried through so saving keeps the stored month
                    academic_year_start_month: String(result.data.academic_year_start_month ?? 6)
                });

                if (result.data.institution_logo_url) {
                    setLogoPreview(result.data.institution_logo_url);
                }
            }
            else {
                setHasData(false);
            }

            setIsLoading(false);
        }

        loadSettings();
    }, []);

    useEffect(function() {
        return function() {
            if (localPreviewUrlRef.current) {
                URL.revokeObjectURL(localPreviewUrlRef.current);
            }
        };
    }, []);

    function clearLocalPreview() {
        if (localPreviewUrlRef.current) {
            URL.revokeObjectURL(localPreviewUrlRef.current);
            localPreviewUrlRef.current = null;
        }
    }

    function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];

        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }

        if (!file) {
            return;
        }

        if (!LOGO_TYPES[file.type]) {
            useToastStore.getState()
                .showToast('Please choose a JPG, PNG, WEBP, or SVG image.', 'error');
            return;
        }

        if (file.size > LOGO_MAX_BYTES) {
            useToastStore.getState()
                .showToast('The logo must be 2 MB or smaller.', 'error');
            return;
        }

        // Show the logo right away, but upload it only on Save
        clearLocalPreview();
        localPreviewUrlRef.current = URL.createObjectURL(file);
        setPendingLogoFile(file);
        setLogoPreview(localPreviewUrlRef.current);
    }

    function handleLogoRemove() {
        clearLocalPreview();
        setPendingLogoFile(null);
        methods.setValue('institution_logo_url', '', { shouldDirty: true });
        setLogoPreview(null);
    }

    function handleCancel() {
        clearLocalPreview();
        setPendingLogoFile(null);
        methods.reset();
        setLogoPreview(methods.getValues('institution_logo_url') || null);
    }

    async function handleSubmit(values: SystemSettingsFormValues) {
        if (loadError || isSaving) {
            return;
        }

        setIsSaving(true);
        try {
            const previousLogoUrl = methods.formState.defaultValues?.institution_logo_url || '';
            let logoUrl = values.institution_logo_url;
            let uploadedPath: string | null = null;

            if (pendingLogoFile) {
                // A new name for every upload, so browsers and the CDN never show an old logo
                uploadedPath = `logos/institution-logo-${Date.now()}.${LOGO_TYPES[pendingLogoFile.type]}`;
                const upload = await uploadFile({
                    bucket: LOGO_BUCKET, file: pendingLogoFile, path: uploadedPath, upsert: false
                });
                if (!upload.data) {
                    return;
                }
                logoUrl = upload.data.url;
            }

            const trimmedValues: SystemSettingsFormValues = {
                ...values,
                institution_name: values.institution_name.trim(),
                institution_short_name: values.institution_short_name.trim(),
                institution_address: values.institution_address.trim(),
                institution_email: values.institution_email.trim(),
                institution_phone: values.institution_phone.trim(),
                institution_mobile: values.institution_mobile?.trim() ?? '',
                institution_website: values.institution_website?.trim() ?? '',
                institution_logo_url: logoUrl
            };
            const result = await updateSystemSettings(trimmedValues);

            if (result.error) {
                // The new file is not used by any saved settings, so remove it again
                if (uploadedPath) {
                    await deleteFile(LOGO_BUCKET, uploadedPath);
                }
                return;
            }

            const previousPath = getLogoStoragePath(previousLogoUrl);
            if (previousPath && previousLogoUrl !== logoUrl) {
                await deleteFile(LOGO_BUCKET, previousPath);
            }

            clearLocalPreview();
            setPendingLogoFile(null);
            setLogoPreview(logoUrl || null);
            setHasData(true);
            methods.reset(trimmedValues);
        }
        finally {
            setIsSaving(false);
        }
    }

    function handleFormError(errors: FieldErrors<SystemSettingsFormValues>) {
        formErrors(errors, methods);
    }

    const fields: FormFieldConfig<SystemSettingsFormValues>[] = [
        {
            name: 'institution_name',
            rules: {
                required: 'Institution name is required',
                validate: (v: unknown) => Boolean(v && String(v)
                    .trim()) || 'Institution name cannot be empty or whitespace only'
            },
            type: 'text'
        },
        {
            name: 'institution_short_name',
            rules: {
                required: 'Short name is required',
                validate: (v: unknown) => Boolean(v && String(v)
                    .trim()) || 'Short name cannot be empty or whitespace only'
            },
            type: 'text'
        },
        {
            name: 'institution_address',
            rules: {
                required: 'Institution address is required',
                validate: (v: unknown) => Boolean(v && String(v)
                    .trim()) || 'Institution address cannot be empty or whitespace only'
            },
            type: 'text'
        },
        {
            name: 'institution_email',
            rules: {
                required: 'Institution email is required',
                pattern: {
                    value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                    message: 'Invalid email address'
                }
            },
            type: 'email'
        },
        {
            name: 'institution_phone',
            rules: {
                required: 'Institution phone is required',
                validate: (v: unknown) => Boolean(v && String(v)
                    .trim()) || 'Institution phone cannot be empty or whitespace only',
                pattern: {
                    value: /^[+(0-9][0-9 ()-]{6,19}$/,
                    message: 'Invalid phone number'
                }
            },
            type: 'text',
            placeholder: '(02) XXXX-XXXX'
        },
        {
            name: 'institution_mobile',
            rules: {
                pattern: {
                    value: /^[+0-9][0-9 ()-]{6,19}$/,
                    message: 'Invalid mobile number'
                }
            },
            type: 'text',
            placeholder: '09XX XXX XXXX'
        },
        {
            name: 'institution_website',
            rules: {
                pattern: {
                    value: /^(https?:\/\/)?([\w-]+\.)+[\w-]+(\/[\w-./?%&=]*)?$/,
                    message: 'Invalid website URL'
                }
            },
            type: 'text'
        }
    ];

    const hasChanges = hasRealChanges || Boolean(pendingLogoFile);
    const isBusy = isSaving || methods.formState.isSubmitting;

    if (isLoading) {
        return (
            <div className="flex h-full items-center justify-center">
                <span className="text-(--mui-palette-text-secondary) text-sm">
                    Loading settings...
                </span>
            </div>
        );
    }

    return (
        <CommonCard
            cardHeaderProps={{
                action: (
                    <div className="flex gap-2 items-center justify-end">
                        <CommonButton
                            disabled={!hasChanges || isBusy}
                            size="small"
                            variant="outlined"
                            onClick={handleCancel}
                        >
                            Cancel
                        </CommonButton>
                        <CommonButton
                            disabled={!hasChanges || isBusy || Boolean(loadError)}
                            form={SETTINGS_FORM_ID}
                            loading={isBusy}
                            size="small"
                            type="submit"
                            variant="contained"
                        >
                            Save Settings
                        </CommonButton>
                    </div>
                ),
                sx: {
                    borderBottom: '1px solid var(--mui-palette-grey-100)',
                    boxShadow: '0 10px 10px -10px rgb(15 23 42 / 0.18)',
                    pb: 2.5,
                    position: 'relative',
                    zIndex: 1
                },
                title: 'System Settings'
            }}
            className="flex flex-col h-full"
            infoContent="Configure institution-wide settings for the system. Changes apply across every portal once saved."
        >
            <div className="flex flex-1 flex-col gap-6 min-h-0 overflow-y-auto p-4 w-full">
                {loadError && (
                    <div
                        className="bg-red-50 border border-red-200 dark:bg-red-950/30 dark:border-red-800/60 dark:text-red-300 flex gap-2.5 items-center p-3.5 rounded-xl text-red-700 text-xs"
                        role="alert"
                    >
                        <WarningCircleIcon className="h-4 shrink-0 w-4" />
                        <span>
                            The system settings could not be loaded ({loadError}). Saving is turned off so the stored settings are not overwritten. Reload the page to try again.
                        </span>
                    </div>
                )}
                {!loadError && !hasData && (
                    <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/60 rounded-xl p-3.5 flex items-center gap-2.5 text-blue-700 dark:text-blue-300 text-xs">
                        <InfoIcon className="w-4 h-4 shrink-0" />
                        <span>
                            No system settings data configured yet. Complete the form below and click &quot;Save Settings&quot; to initialize institutional settings.
                        </span>
                    </div>
                )}
                <div className="flex flex-col gap-4 items-center sm:flex-row sm:items-center">
                    {logoPreview
                        ? (
                            <img
                                alt="Institution logo"
                                className="bg-white border border-(--mui-palette-divider) h-24 object-contain p-2 rounded-full shrink-0 w-24"
                                src={logoPreview}
                            />
                        )
                        : (
                            <span className="bg-(--mui-palette-action-hover) border border-(--mui-palette-divider) flex h-24 items-center justify-center rounded-full shrink-0 text-(--mui-palette-text-secondary) text-xs w-24">
                                No logo
                            </span>
                        )
                    }
                    <div className="flex flex-col gap-2 items-center sm:items-start">
                        <h2 className="font-semibold text-(--mui-palette-text-primary) text-sm">
                            Institution Logo
                            <span className="inline-flex align-middle ml-1.5 whitespace-nowrap">
                                <CommonInfoTooltip
                                    content="JPG, PNG, WEBP, or SVG, up to 2 MB. The logo is uploaded when you save, and appears on portal headers and printed documents."
                                    label="About the institution logo"
                                    size={16}
                                />
                            </span>
                        </h2>
                        <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                            <CommonButton
                                disabled={isBusy || Boolean(loadError)}
                                size="small"
                                startIcon={<CameraIcon />}
                                variant="contained"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                {logoPreview
                                    ? 'Change Logo'
                                    : 'Upload Logo'
                                }
                            </CommonButton>
                            {logoPreview && (
                                <CommonButton
                                    color="error"
                                    disabled={isBusy || Boolean(loadError)}
                                    size="small"
                                    startIcon={<TrashIcon />}
                                    variant="outlined"
                                    onClick={handleLogoRemove}
                                >
                                    Remove
                                </CommonButton>
                            )}
                        </div>
                    </div>
                    <input
                        accept="image/jpeg,image/png,image/webp,image/svg+xml"
                        className="hidden"
                        ref={fileInputRef}
                        type="file"
                        onChange={handleLogoChange}
                    />
                </div>
                <form
                    id={SETTINGS_FORM_ID}
                    onSubmit={methods.handleSubmit(handleSubmit, handleFormError)}
                >
                    <CommonForm
                        autoOpenFirstErrorTooltip={false}
                        component="div"
                        containerClassName="gap-4 grid grid-cols-1 md:grid-cols-2"
                        control={methods.control}
                        defaultOpenErrorTooltip={false}
                        fields={fields}
                        hasHelper
                    />
                </form>
            </div>
        </CommonCard>
    );
}