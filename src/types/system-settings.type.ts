export interface SystemSettings {
    id: string;
    institution_name: string;
    institution_short_name: string;
    institution_address: string;
    institution_email: string;
    institution_phone: string;
    institution_website: string;
    institution_logo_url: string;
    academic_year_start_month: number;
    max_units_per_term: number;
    default_term_type_id: string | null;
}

export interface SystemSettingsFormValues {
    institution_name: string;
    institution_short_name: string;
    institution_address: string;
    institution_email: string;
    institution_phone: string;
    institution_website: string;
    institution_logo_url: string;
    academic_year_start_month: string;
    max_units_per_term: string;
    default_term_type_id: string;
}