export interface SchoolYearListRow {
    id: string;
    code: string;
    label: string;
    start_date: string;
    end_date: string;
    is_active: boolean;
    total_count: number;
}

export interface SchoolYearFormValues {
    code: string;
    label: string;
    start_date: string;
    end_date: string;
    is_active: boolean;
}

export interface SchoolYearFilterValues {
    is_active: 'All' | 'true' | 'false';
    year: string;
}

export interface SchoolYearOption {
    id: string;
    code: string;
    label: string;
}