export interface LoginFormValues {
    email: string;
    password: string;
}

export interface ForgotPasswordFormValues {
    email: string;
}

export type RoleDashboardPath = '/admin' | '/faculty' | '/student' | '/registrar' | '/dean';