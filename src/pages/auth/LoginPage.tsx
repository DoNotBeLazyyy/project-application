import CommonButton from '@components/button/CommonButton';
import CommonCard from '@components/card/CommonCard';
import ValidCommonInput from '@components/input/ValidCommonInput';
import { login } from '@services/auth.service';
import { useAppStore } from '@stores/app.store';
import { UserRole } from '@type/app.type';
import { LoginFormValues, RoleDashboardPath } from '@type/auth.type';
import { formErrors } from '@utils/form.util';
import { useEffect, useState } from 'react';
import { FieldErrors, useForm } from 'react-hook-form';
import { useLocation, useNavigate } from 'react-router-dom';

interface LoginLocationState {
    activationSuccess?: boolean;
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
        const currentRole = useAppStore.getState().activeRole;

        navigate(currentRole
            ? ROLE_PATHS[currentRole]
            : '/unauthorized');
    }

    function handleFormError(errors: FieldErrors<LoginFormValues>) {
        formErrors(errors, methods);
    }

    return (
        <div className="flex h-full items-center justify-center w-full">
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
                        <p className="m-0 text-(--mui-tokens-color-red-500) text-sm">
                            {loginError}
                        </p>
                    )}

                    <ValidCommonInput
                        control={methods.control}
                        fullWidth
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
                        control={methods.control}
                        fullWidth
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
                        size="large"
                        type="submit"
                        variant="contained"
                    >
                        {isSubmitting
                            ? 'Signing in…'
                            : 'Sign In'
                        }
                    </CommonButton>
                </form>
            </CommonCard>
        </div>
    );
}