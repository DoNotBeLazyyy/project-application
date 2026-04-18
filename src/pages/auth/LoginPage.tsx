import CommonButton from '@components/button/CommonButton';
import CommonCard from '@components/card/CommonCard';
import CommonInput from '@components/input/CommonInput';
import { Typography } from '@mui/material';
import { login } from '@services/auth.service';
import { useAppStore } from '@stores/app.store';
import { UserRole } from '@type/app.type';
import { LoginFormValues, RoleDashboardPath } from '@type/auth.type';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';

const ROLE_PATHS: Record<UserRole, RoleDashboardPath> = {
    Admin: '/admin',
    Dean: '/dean',
    Faculty: '/faculty',
    Registrar: '/registrar',
    Student: '/student'
};

export default function LoginPage() {
    const navigate = useNavigate();
    const [loginError, setLoginError] = useState<string | null>(null);

    const { control, handleSubmit, formState: { isSubmitting } } = useForm<LoginFormValues>({
        defaultValues: { email: '', password: '' }
    });

    async function onSubmit(values: LoginFormValues) {
        setLoginError(null);
        const result = await login(values.email, values.password);
        if (result.error) {
            setLoginError(result.error.message);
            return;
        }
        const role = useAppStore.getState().activeRole;
        navigate(role
            ? ROLE_PATHS[role]
            : '/unauthorized');
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
                    onSubmit={handleSubmit(onSubmit)}
                >
                    <Typography variant="h6">
                        Sign in to your account
                    </Typography>

                    {loginError && (
                        <Typography
                            color="error"
                            variant="body2"
                        >
                            {loginError}
                        </Typography>
                    )}

                    <Controller
                        control={control}
                        name="email"
                        render={({ field, fieldState }) => (
                            <CommonInput
                                {...field}
                                error={!!fieldState.error}
                                fullWidth
                                helperText={fieldState.error?.message}
                                isRequired
                                label="Email"
                                placeholder="Enter your email"
                                size="small"
                                type="email"
                                variant="outlined"
                            />
                        )}
                        rules={{ required: 'Email is required' }}
                    />

                    <Controller
                        control={control}
                        name="password"
                        render={({ field, fieldState }) => (
                            <CommonInput
                                {...field}
                                error={!!fieldState.error}
                                fullWidth
                                helperText={fieldState.error?.message}
                                isRequired
                                label="Password"
                                placeholder="Enter your password"
                                size="small"
                                type="password"
                                variant="outlined"
                            />
                        )}
                        rules={{ required: 'Password is required' }}
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