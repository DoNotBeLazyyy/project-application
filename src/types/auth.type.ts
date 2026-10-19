export interface LoginFormValues {
    email: string;
    password: string;
}

export interface ForgotPasswordFormValues {
    email: string;
}

export interface VerifyEmailResult {
    exists: boolean;
    status?: string;
    message: string;
    success?: boolean;
}

export type RoleDashboardPath = '/admin' | '/faculty' | '/student' | '/registrar' | '/dean';