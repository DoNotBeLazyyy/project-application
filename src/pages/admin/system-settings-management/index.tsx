import CommonButton from '@components/button/CommonButton';
import CommonCard from '@components/card/CommonCard';
import CommonForm from '@components/form/CommonForm';
import { FormFieldConfig } from '@components/form/FormField';
import { useTermTypeOptions } from '@pages/admin/term-management/type/useTermTypeOptions';
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
    const { termTypeOptions } = useTermTypeOptions();
    const methods = useForm<SystemSettingsFormValues>({
        defaultValues: {
            institution_name: '',
            institution_short_name: '',
            institution_address: '',
            institution_email: '',
            institution_phone: '',
            institution_website: '',
            institution_logo_url: '',
            academic_year_start_month: '6',
            max_units_per_term: '24',
            default_term_type_id: ''
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
                    institution_website: result.data.institution_website,
                    institution_logo_url: result.data.institution_logo_url,
                    academic_year_start_month: String(result.data.academic_year_start_month),
                    max_units_per_term: String(result.data.max_units_per_term),
                    default_term_type_id: result.data.default_term_type_id ?? ''
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
            methods.setValue('institution_logo_url', result.data.url);
            setLogoPreview(result.data.url);
        }

        setIsUploadingLogo(false);

        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
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
            type: 'text'
        },
        {
            name: 'institution_email',
            rules: {
                pattern: {
                    value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                    message: 'Invalid email address'
                }
            },
            type: 'email'
        },
        {
            name: 'institution_phone',
            type: 'text'
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
            name: 'max_units_per_term',
            rules: {
                required: 'Max units per term is required',
                min: { value: 1, message: 'Must be at least 1' },
                max: { value: 60, message: 'Cannot exceed 60' }
            },
            type: 'number',
            fieldProps: {
                max: 24
            }
        },
        {
            name: 'default_term_type_id',
            options: [{ label: 'None', value: '' }, ...termTypeOptions],
            type: 'select'
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
        <CommonCard className="h-full">
            <div className="flex flex-col gap-6 h-full max-w-4xl overflow-y-auto">
                <div className="flex flex-col gap-1">
                    <h1 className="font-semibold text-(--mui-palette-text-primary) text-xl">
                    System Settings
                    </h1>
                    <p className="text-(--mui-palette-text-secondary) text-sm">
                    Configure institution-wide settings for the system.
                    </p>
                </div>
                <div className="flex flex-col gap-2">
                    <span className="font-medium text-(--mui-palette-text-primary) text-sm">
                    Institution Logo
                    </span>
                    <div className="flex gap-4 items-center">
                        {logoPreview
                            ? (
                                <img
                                    alt="Institution logo"
                                    className="border border-(--mui-palette-divider) h-16 object-contain rounded-lg w-16"
                                    src={logoPreview}
                                />
                            )
                            : (
                                <div className="bg-(--mui-palette-action-hover) border border-(--mui-palette-divider) flex h-16 items-center justify-center rounded-lg w-16">
                                    <span className="text-(--mui-palette-text-secondary) text-xs">
                                    No logo
                                    </span>
                                </div>
                            )
                        }
                        <input
                            accept="image/jpeg,image/png,image/webp,image/svg+xml"
                            className="hidden"
                            ref={fileInputRef}
                            type="file"
                            onChange={handleLogoChange}
                        />
                        <CommonButton
                            disabled={isUploadingLogo}
                            size="small"
                            variant="outlined"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            {isUploadingLogo
                                ? 'Uploading...'
                                : 'Upload Logo'
                            }
                        </CommonButton>
                    </div>
                </div>
                <form
                    id={SETTINGS_FORM_ID}
                    onSubmit={methods.handleSubmit(handleSubmit, handleFormError)}
                >
                    <CommonForm
                        containerClassName="gap-4 grid grid-cols-2"
                        control={methods.control}
                        fields={fields}
                    />
                </form>
                <div className="flex gap-2 justify-start">
                    <CommonButton
                        size="small"
                        variant="outlined"
                        onClick={() => methods.reset()}
                    >
                    Reset
                    </CommonButton>
                    <CommonButton
                        form={SETTINGS_FORM_ID}
                        size="small"
                        type="submit"
                        variant="contained"
                    >
                    Save Settings
                    </CommonButton>
                </div>
            </div>
        </CommonCard>
    );
}