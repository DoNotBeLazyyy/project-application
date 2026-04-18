export interface ServiceErrorProps {
    message: string;
    code: string | null;
    status: number | null;
}

export interface ServiceResult<T> {
    data: T | null;
    error: ServiceErrorProps | null;
}

export interface SupabaseRawResult<T> {
    data: T | null;
    error: { message: string; code?: string; status?: number; details?: string } | null;
}