import CommonButton from '@components/button/CommonButton';
import CommonCard from '@components/card/CommonCard';
import ValidCommonInput from '@components/input/ValidCommonInput';
import { EMAIL_PATTERN } from '@constants/validation.constant';
import { login, logout } from '@services/auth.service';
import { useAppStore } from '@stores/app.store';
import { useToastStore } from '@stores/toast.store';
import { UserRole } from '@type/app.type';
import { LoginFormValues, RoleDashboardPath } from '@type/auth.type';
import { clearAuthUrlError, parseAuthUrlError } from '@utils/auth-error.util';
import { DEFAULT_FORM_OPTIONS, formErrors } from '@utils/form.util';
import { isSessionExpiredDueToInactivity } from '@utils/session.util';
import { useEffect } from 'react';
import { FieldErrors, useForm } from 'react-hook-form';
import { useLocation, useNavigate } from 'react-router-dom';

interface LoginLocationState {
    // Shown after an invited user sets a password
    activationSuccess?: boolean;
    // Sign-in error passed from the auth guard
    authError?: string;
    // Page the user opened before being sent to sign in
    from?: string;
}

const ROLE_PATHS: Record<UserRole, RoleDashboardPath> = {
    Admin: '/admin',
    Dean: '/dean',
    Faculty: '/faculty',
    Registrar: '/registrar',
    Student: '/student'
};

/**
 * Picks where to go after sign in. The page the user first opened wins when it belongs to their role.
 *
 * @param role - Active role of the signed-in user.
 * @param from - Page the user opened before signing in.
 * @returns
 */
function resolveLoginDestination(role: UserRole, from?: string): string {
    const basePath = ROLE_PATHS[role];
    const isRolePage = Boolean(from && (from === basePath || from.startsWith(`${basePath}/`) || from.startsWith(`${basePath}?`)));

    return isRolePage && from
        ? from
        : basePath;
}

export default function LoginPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const locationState = location.state as LoginLocationState | null;
    const activeRole = useAppStore((state) => state.activeRole);
    const methods = useForm<LoginFormValues>({
        ...DEFAULT_FORM_OPTIONS,
        defaultValues: { email: '', password: '' }
    });
    const { handleSubmit, formState: { isSubmitting } } = methods;

    useEffect(() => {
        const urlErr = parseAuthUrlError();
        const initialErr = locationState?.authError || urlErr?.userMessage;
        if (initialErr) {
            useToastStore.getState()
                .showToast(initialErr, 'error');
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
            navigate(resolveLoginDestination(activeRole, locationState?.from), { replace: true });
        }
    }, [activeRole, locationState?.from, navigate]);

    async function onSubmit(values: LoginFormValues) {
        const result = await login(values.email, values.password);
        if (result.error) {
            useToastStore.getState()
                .showToast(result.error.message, 'error');

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
            ? resolveLoginDestination(currentRole, locationState?.from)
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

                    <ValidCommonInput
                        autoComplete="email"
                        control={methods.control}
                        fullWidth
                        hasHelper
                        isRequired
                        label="Email"
                        name="email"
                        placeholder="Enter your email"
                        rules={{
                            required: 'Email is required',
                            pattern: EMAIL_PATTERN
                        }}
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

                    <CommonButton
                        disabled={isSubmitting}
                        fullWidth
                        loading={isSubmitting}
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