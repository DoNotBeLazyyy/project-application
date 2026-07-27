import CommonButton from '@components/button/CommonButton';
import CommonCard from '@components/card/CommonCard';
import ValidCommonInput from '@components/input/ValidCommonInput';
import { logout } from '@services/auth.service';
import { supabase } from '@services/supabase.client';
import { callRpc } from '@services/supabase.wrapper';
import { SetPasswordFormValues } from '@type/user.type';
import { parseServiceError } from '@utils/error.util';
import { formErrors } from '@utils/form.util';
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';

export default function SetPasswordPage() {
    const navigate = useNavigate();
    const [sessionReady, setSessionReady] = useState(false);
    const [isTimedOut, setIsTimedOut] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const mountedRef = useRef(true);

    const methods = useForm<SetPasswordFormValues>({
        defaultValues: {
            confirm_password: '',
            password: ''
        }
    });

    const { control, handleSubmit, getValues } = methods;

    useEffect(() => {
        mountedRef.current = true;

        supabase.auth.getSession()
            .then(({ data: { session } }) => {
                if (mountedRef.current && session) {
                    setSessionReady(true);
                }
            });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (session && (event === 'SIGNED_IN' || event === 'PASSWORD_RECOVERY')) {
                if (mountedRef.current) {
                    setSessionReady(true);
                }
            }
        });

        const timeoutId = setTimeout(() => {
            if (mountedRef.current) {
                setIsTimedOut(true);
            }
        }, 10000);

        return () => {
            mountedRef.current = false;
            subscription.unsubscribe();
            clearTimeout(timeoutId);
        };
    }, []);

    async function handleRestart() {
        await supabase.auth.signOut();
        navigate('/login');
    }

    async function onSubmit(values: SetPasswordFormValues) {
        setSubmitError(null);

        const { error: updateError } = await supabase.auth.updateUser({ password: values.password });
        if (updateError) {
            setSubmitError(parseServiceError(updateError).message ?? 'Failed to set password.');
            return;
        }

        const activateResult = await callRpc('fn_activate_user');
        if (activateResult.error) {
            setSubmitError(activateResult.error.message ?? 'Failed to activate account.');
            return;
        }

        await logout();
        navigate('/login', { state: { activationSuccess: true } });
    }

    function handleFormErrors() {
        formErrors(methods.formState.errors, methods);
    }

    if (!sessionReady) {
        return (
            <div className="flex flex-col gap-4 h-screen items-center justify-center w-full">
                <p className="text-(--mui-palette-text-secondary) text-sm">
                    Verifying invite link…
                </p>
                {isTimedOut && (
                    <div className="flex flex-col gap-2 items-center">
                        <p className="text-(--mui-palette-error-main) text-sm">
                            Your invite link may have expired or already been used.
                        </p>
                        <CommonButton
                            variant="outlined"
                            onClick={handleRestart}
                        >
                            Restart Process
                        </CommonButton>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="flex h-screen items-center justify-center w-full">
            <CommonCard className="flex flex-col gap-6 max-w-sm p-8 w-full">
                <div className="flex flex-col gap-1">
                    <h2 className="font-bold text-(--mui-palette-text-primary) text-xl">
                        Set Your Password
                    </h2>
                    <p className="text-(--mui-palette-text-secondary) text-sm">
                        Create a secure password to activate your account.
                    </p>
                </div>

                <form
                    className="flex flex-col gap-4"
                    onSubmit={handleSubmit(onSubmit, handleFormErrors)}
                >
                    <div className="flex flex-col gap-1">
                        <span className="font-medium text-(--mui-palette-text-primary) text-sm">
                            New Password
                        </span>
                        <ValidCommonInput
                            control={control}
                            fullWidth
                            hasPasswordToggle
                            name="password"
                            rules={{
                                minLength: { message: 'Password must be at least 8 characters.', value: 8 },
                                required: 'Password is required.'
                            }}
                            size="large"
                            type="password"
                        />
                    </div>

                    <div className="flex flex-col gap-1">
                        <span className="font-medium text-(--mui-palette-text-primary) text-sm">
                            Confirm Password
                        </span>
                        <ValidCommonInput
                            control={control}
                            fullWidth
                            hasPasswordToggle
                            name="confirm_password"
                            rules={{
                                required: 'Please confirm your password.',
                                validate: (val) =>
                                    val === getValues('password')
                                        ? true
                                        : 'Passwords do not match.'
                            }}
                            size="large"
                            type="password"
                        />
                    </div>

                    {submitError && (
                        <p className="text-(--mui-palette-error-main) text-sm">
                            {submitError}
                        </p>
                    )}

                    <CommonButton
                        fullWidth
                        type="submit"
                        variant="contained"
                    >
                        Activate Account
                    </CommonButton>
                </form>
            </CommonCard>
        </div>
    );
}