import CommonButton from '@components/button/CommonButton';
import CommonCard from '@components/card/CommonCard';
import FormErrorSummary from '@components/form/FormErrorSummary';
import ValidCommonInput from '@components/input/ValidCommonInput';
import { login, logout } from '@services/auth.service';
import { useAppStore } from '@stores/app.store';
import { UserRole } from '@type/app.type';
import { LoginFormValues, RoleDashboardPath } from '@type/auth.type';
import { clearAuthUrlError, parseAuthUrlError } from '@utils/auth-error.util';
import { formErrors } from '@utils/form.util';
import { isSessionExpiredDueToInactivity } from '@utils/session.util';
import { useEffect, useState } from 'react';
import { FieldErrors, useForm } from 'react-hook-form';
import { useLocation, useNavigate } from 'react-router-dom';

interface LoginLocationState {
    activationSuccess?: boolean;
    authError?: string;
}

const ROLE_PATHS: Record<UserRole, RoleDashboardPath> = {
    Admin: '/admin',
    Dean: '/dean',
    Faculty: '/faculty',
    Registrar: '/registrar',
    Student: '/student'
};

export default function LoginPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const locationState = location.state as LoginLocationState | null;
    const [loginError, setLoginError] = useState<string | null>(null);
    const activeRole = useAppStore((state) => state.activeRole);
    const methods = useForm<LoginFormValues>({
        defaultValues: { email: '', password: '' }
    });
    const { handleSubmit, formState: { isSubmitting } } = methods;

    useEffect(() => {
        const urlErr = parseAuthUrlError();
        const initialErr = locationState?.authError || urlErr?.userMessage;
        if (initialErr) {
            setLoginError(initialErr);
            clearAuthUrlError();
        }
    }, [locationState?.authError]);

    useEffect(() => {
        if (isSessionExpiredDueToInactivity()) {
            logout();
            return;
        }

        const profile = useAppStore.getState().userProfile;
        if (profile?.status === 'Invited') {
            navigate('/set-password', { replace: true });
            return;
        }
        if (activeRole) {
            navigate(ROLE_PATHS[activeRole], { replace: true });
        }
    }, [activeRole, navigate]);

    async function onSubmit(values: LoginFormValues) {
        setLoginError(null);
        const result = await login(values.email, values.password);
        if (result.error) {
            setLoginError(result.error.message);

            return;
        }

        // Fetch fresh state to avoid stale closures during the async login
        const state = useAppStore.getState();
        if (state.userProfile?.status === 'Invited') {
            navigate('/set-password', { replace: true });
            return;
        }

        const currentRole = state.activeRole;

        navigate(currentRole
            ? ROLE_PATHS[currentRole]
            : '/unauthorized');
    }

    function handleFormError(errors: FieldErrors<LoginFormValues>) {
        formErrors(errors, methods);
    }

    function handleForgotPassword() {
        navigate('/forgot-password');
    }

    return (
        <div className="flex h-full items-center justify-center p-4 sm:p-6 w-full">
            <CommonCard
                cardHeaderProps={{ title: 'AU-JAS LMS' }}
                className="max-w-md w-full"
                variant="outlined"
            >
                <form
                    className="flex flex-col gap-6 p-6"
                    onSubmit={handleSubmit(onSubmit, handleFormError)}
                >
                    <h6 className="font-medium m-0 text-xl">
                        Sign in to your account
                    </h6>

                    {locationState?.activationSuccess && (
                        <p className="m-0 text-(--mui-palette-success-main) text-sm">
                            Account activated successfully. Please sign in.
                        </p>
                    )}

                    {loginError && (
                        <div className="bg-red-50 border border-red-200 dark:bg-red-950/30 dark:border-red-900 leading-relaxed p-3 rounded-md text-(--mui-tokens-color-red-500) text-sm">
                            {loginError}
                        </div>
                    )}

                    <ValidCommonInput
                        autoComplete="email"
                        control={methods.control}
                        fullWidth
                        hasHelper
                        isRequired
                        label="Email"
                        name="email"
                        placeholder="Enter your email"
                        rules={{ required: 'Email is required' }}
                        size="small"
                        type="email"
                        variant="outlined"
                    />

                    <ValidCommonInput
                        autoComplete="current-password"
                        control={methods.control}
                        fullWidth
                        hasHelper
                        hasPasswordToggle
                        isRequired
                        label="Password"
                        name="password"
                        placeholder="Enter your password"
                        rules={{ required: 'Password is required' }}
                        size="small"
                        type="password"
                        variant="outlined"
                    />

                    <FormErrorSummary control={methods.control} />

                    <CommonButton
                        disabled={isSubmitting}
                        fullWidth
                        size="large"
                        type="submit"
                        variant="contained"
                    >
                        {isSubmitting
                            ? 'Signing in…'
                            : 'Sign In'
                        }
                    </CommonButton>

                    <button
                        className="cursor-pointer text-(--mui-palette-primary-main) text-sm"
                        type="button"
                        onClick={handleForgotPassword}
                    >
                        Forgot password?
                    </button>
                </form>
            </CommonCard>
        </div>
    );
}