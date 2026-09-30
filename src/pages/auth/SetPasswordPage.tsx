import CommonButton from '@components/button/CommonButton';
import CommonCard from '@components/card/CommonCard';
import FormErrorSummary from '@components/form/FormErrorSummary';
import ValidCommonInput from '@components/input/ValidCommonInput';
import { logout } from '@services/auth.service';
import { supabase } from '@services/supabase.client';
import { callRpc } from '@services/supabase.wrapper';
import { SetPasswordFormValues } from '@type/user.type';
import { clearAuthUrlError, parseAuthUrlError } from '@utils/auth-error.util';
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

        const authErr = parseAuthUrlError();
        if (authErr) {
            if (mountedRef.current) {
                setIsTimedOut(true);
                setSubmitError(authErr.userMessage);
            }
            clearAuthUrlError();
            return;
        }

        // Support token_hash from query string or hash fragment
        if (typeof window !== 'undefined') {
            const searchParams = new URLSearchParams(window.location.search);
            const hashParams = new URLSearchParams(
                window.location.hash.startsWith('#')
                    ? window.location.hash.substring(1)
                    : window.location.hash
            );
            const tokenHash = searchParams.get('token_hash') || hashParams.get('token_hash');
            const rawType = searchParams.get('type') || hashParams.get('type') || 'invite';
            const tokenType = (rawType === 'recovery' ? 'recovery' : 'invite') as 'invite' | 'recovery';

            if (tokenHash) {
                supabase.auth.verifyOtp({ token_hash: tokenHash, type: tokenType })
                    .then(({ data, error }) => {
                        if (mountedRef.current) {
                            if (error) {
                                setIsTimedOut(true);
                                setSubmitError(
                                    error.message?.toLowerCase().includes('expired') ||
                                    error.message?.toLowerCase().includes('invalid')
                                        ? 'Your invite or password reset link has expired or has already been used. Please request a new link or contact your administrator.'
                                        : error.message
                                );
                            } else if (data?.session) {
                                setSessionReady(true);
                            }
                        }
                    });
            }
        }

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
        }, 8000);

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
            <div className="flex flex-col gap-4 h-full items-center justify-center p-4 text-center w-full">
                {!isTimedOut && (
                    <p className="text-(--mui-palette-text-secondary) text-sm">
                        Verifying invite link…
                    </p>
                )}
                {isTimedOut && (
                    <div className="bg-red-50 border border-red-200 dark:bg-red-950/30 dark:border-red-900 flex flex-col gap-4 items-center max-w-md p-6 rounded-lg shadow-sm">
                        <h6 className="font-semibold text-(--mui-tokens-color-red-500) text-base">
                            Link Expired or Invalid
                        </h6>
                        <p className="leading-relaxed text-(--mui-palette-text-secondary) text-sm">
                            {submitError ??
                                'Your invite link may have expired or already been used. Please request a new setup link or contact your administrator.'}
                        </p>
                        <div className="flex flex-col gap-2 sm:flex-row w-full">
                            <CommonButton
                                fullWidth
                                variant="contained"
                                onClick={() => navigate('/forgot-password')}
                            >
                                Request New Link
                            </CommonButton>
                            <CommonButton
                                fullWidth
                                variant="outlined"
                                onClick={handleRestart}
                            >
                                Back to Sign In
                            </CommonButton>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="flex h-full items-center justify-center p-4 sm:p-6 w-full">
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
                            hasHelper
                            hasPasswordToggle
                            helperText="At least 8 characters."
                            name="password"
                            rules={{
                                deps: ['confirm_password'],
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
                            hasHelper
                            hasPasswordToggle
                            helperText="Re-enter the same password."
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

                    <FormErrorSummary control={control} />

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