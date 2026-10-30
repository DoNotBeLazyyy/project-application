export interface SystemSettings {
    id: string;
    institution_name: string;
    institution_short_name: string;
    institution_address: string;
    institution_email: string;
    institution_phone: string;
    institution_mobile: string;
    institution_website: string;
    institution_logo_url: string;
    academic_year_start_month?: number;
}

export interface SystemSettingsFormValues {
    institution_name: string;
    institution_short_name: string;
    institution_address: string;
    institution_email: string;
    institution_phone: string;
    institution_mobile: string;
    institution_website: string;
    institution_logo_url: string;
    academic_year_start_month?: string;
}