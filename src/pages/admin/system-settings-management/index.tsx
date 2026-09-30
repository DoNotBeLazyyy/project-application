import CommonButton from '@components/button/CommonButton';
import CommonCard from '@components/card/CommonCard';
import CommonForm from '@components/form/CommonForm';
import { FormFieldConfig } from '@components/form/FormField';
import CommonInfoTooltip from '@components/tooltip/CommonInfoTooltip';
import { CameraIcon, TrashIcon } from '@phosphor-icons/react';
import { uploadFile } from '@services/storage.service';
import { getSystemSettings, updateSystemSettings } from '@services/system-settings.service';
import { SystemSettingsFormValues } from '@type/system-settings.type';
import { formErrors } from '@utils/form.util';
import { useEffect, useRef, useState } from 'react';
import { FieldErrors, useForm } from 'react-hook-form';

const MONTH_OPTIONS = [
    { label: 'January', value: '1' },
    { label: 'February', value: '2' },
    { label: 'March', value: '3' },
    { label: 'April', value: '4' },
    { label: 'May', value: '5' },
    { label: 'June', value: '6' },
    { label: 'July', value: '7' },
    { label: 'August', value: '8' },
    { label: 'September', value: '9' },
    { label: 'October', value: '10' },
    { label: 'November', value: '11' },
    { label: 'December', value: '12' }
];

const SETTINGS_FORM_ID = 'system-settings-form';

export default function SystemSettings() {
    const [isLoading, setIsLoading] = useState(true);
    const [logoPreview, setLogoPreview] = useState<string | null>(null);
    const [isUploadingLogo, setIsUploadingLogo] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
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
            academic_year_start_month: '6',
            max_upload_size_mb: '25',
            allowed_upload_types: 'pdf,docx,xlsx,pptx,png,jpg,jpeg,zip'
        }
    });

    useEffect(function() {
        async function loadSettings() {
            const result = await getSystemSettings();

            if (result.data) {
                methods.reset({
                    institution_name: result.data.institution_name,
                    institution_short_name: result.data.institution_short_name,
                    institution_address: result.data.institution_address,
                    institution_email: result.data.institution_email,
                    institution_phone: result.data.institution_phone,
                    institution_mobile: result.data.institution_mobile ?? '',
                    institution_website: result.data.institution_website,
                    institution_logo_url: result.data.institution_logo_url,
                    academic_year_start_month: String(result.data.academic_year_start_month),
                    max_upload_size_mb: String(result.data.max_upload_size_mb ?? 25),
                    allowed_upload_types: result.data.allowed_upload_types ?? 'pdf,docx,xlsx,pptx,png,jpg,jpeg,zip'
                });

                if (result.data.institution_logo_url) {
                    setLogoPreview(result.data.institution_logo_url);
                }
            }

            setIsLoading(false);
        }

        loadSettings();
    }, []);

    async function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];

        if (!file) {
            return;
        }

        setIsUploadingLogo(true);

        const path = `logos/institution-logo.${file.name.split('.')
            .pop()}`;
        const result = await uploadFile({ bucket: 'logos', file, path, upsert: true });

        if (result.data) {
            methods.setValue('institution_logo_url', result.data.url, { shouldDirty: true });
            setLogoPreview(result.data.url);
        }

        setIsUploadingLogo(false);

        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    }

    function handleLogoRemove() {
        methods.setValue('institution_logo_url', '', { shouldDirty: true });
        setLogoPreview(null);
    }

    function handleCancel() {
        methods.reset();
        setLogoPreview(methods.getValues('institution_logo_url') || null);
    }

    async function handleSubmit(values: SystemSettingsFormValues) {
        const result = await updateSystemSettings(values);

        if (!result.error) {
            methods.reset(values);
        }
    }

    function handleFormError(errors: FieldErrors<SystemSettingsFormValues>) {
        formErrors(errors, methods);
    }

    const fields: FormFieldConfig<SystemSettingsFormValues>[] = [
        {
            name: 'institution_name',
            rules: { required: 'Institution name is required' },
            type: 'text'
        },
        {
            name: 'institution_short_name',
            rules: { required: 'Short name is required' },
            type: 'text'
        },
        {
            name: 'institution_address',
            rules: { required: 'Institution address is required' },
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
            rules: { required: 'Institution phone is required' },
            type: 'text'
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
        },
        {
            name: 'academic_year_start_month',
            options: MONTH_OPTIONS,
            rules: { required: 'Academic year start month is required' },
            type: 'select'
        },
        {
            label: 'Max Upload Size (MB)',
            name: 'max_upload_size_mb',
            rules: {
                required: 'Max upload size is required',
                min: { value: 1, message: 'Must be at least 1 MB' },
                max: { value: 500, message: 'Cannot exceed 500 MB' }
            },
            type: 'number',
            fieldProps: {
                helperText: 'Applies to materials, submissions, discussion attachments, and event images.'
            }
        },
        {
            label: 'Allowed File Types',
            name: 'allowed_upload_types',
            rules: { required: 'At least one file type is required' },
            type: 'text',
            fieldProps: {
                helperText: 'Comma-separated extensions without dots, e.g. pdf,docx,png,zip'
            }
        }
    ];

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
                            disabled={!methods.formState.isDirty}
                            size="small"
                            variant="outlined"
                            onClick={handleCancel}
                        >
                            Cancel
                        </CommonButton>
                        <CommonButton
                            disabled={!methods.formState.isDirty}
                            form={SETTINGS_FORM_ID}
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
                        <div className="flex gap-(--mui-tokens-spacing-3) items-center">
                            <h2 className="font-semibold text-(--mui-palette-text-primary) text-sm">
                                Institution Logo
                            </h2>
                            <CommonInfoTooltip
                                content="JPG, PNG, WEBP, or SVG. The logo appears on portal headers and printed documents."
                                label="About the institution logo"
                                size={16}
                            />
                        </div>
                        <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                            <CommonButton
                                loading={isUploadingLogo}
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
                                    disabled={isUploadingLogo}
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
                        containerClassName="gap-4 grid grid-cols-1 md:grid-cols-2"
                        control={methods.control}
                        fields={fields}
                        hasHelper
                    />
                </form>
            </div>
        </CommonCard>
    );
}