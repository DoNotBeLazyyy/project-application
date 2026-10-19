import CommonButton from '@components/button/CommonButton';
import CommonCard from '@components/card/CommonCard';
import ValidCommonInput from '@components/input/ValidCommonInput';
import { EMAIL_PATTERN } from '@constants/validation.constant';
import { CheckCircleIcon, WarningCircleIcon } from '@phosphor-icons/react';
import { requestPasswordReset, verifyUserEmail } from '@services/auth.service';
import { useToastStore } from '@stores/toast.store';
import { ForgotPasswordFormValues } from '@type/auth.type';
import { DEFAULT_FORM_OPTIONS, formErrors } from '@utils/form.util';
import { useState } from 'react';
import { FieldErrors, useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';

interface VerificationNotice {
    type: 'error' | 'success';
    title: string;
    message: string;
}

export default function ForgotPasswordPage() {
    const navigate = useNavigate();
    const [isSent, setIsSent] = useState(false);
    const [sentEmail, setSentEmail] = useState('');
    const [isVerifyingOnly, setIsVerifyingOnly] = useState(false);
    const [verificationNotice, setVerificationNotice] = useState<VerificationNotice | null>(null);

    const methods = useForm<ForgotPasswordFormValues>({
        ...DEFAULT_FORM_OPTIONS,
        defaultValues: { email: '' }
    });
    const { handleSubmit, formState: { isSubmitting } } = methods;

    async function onSubmit(values: ForgotPasswordFormValues) {
        setVerificationNotice(null);

        const result = await requestPasswordReset(values.email);

        if (result.error) {
            const errorTitle = result.error.code === 'ACCOUNT_SUSPENDED'
                ? 'Account Suspended'
                : result.error.code === 'ACCOUNT_INACTIVE'
                    ? 'Account Inactive'
                    : 'Email Not Found';

            setVerificationNotice({
                type: 'error',
                title: errorTitle,
                message: result.error.message
            });

            methods.setError('email', {
                type: 'manual',
                message: result.error.message
            });

            useToastStore.getState().showToast(result.error.message, 'error');
            return;
        }

        setSentEmail(values.email);
        setIsSent(true);
        useToastStore.getState().showToast(
            'Email verified. Password reset link has been sent to your email.',
            'success'
        );
    }

    async function handleVerifyOnly() {
        const email = methods.getValues('email');
        if (!email || !EMAIL_PATTERN.value.test(email)) {
            methods.setError('email', {
                type: 'manual',
                message: 'Please enter a valid email address first.'
            });
            return;
        }

        setIsVerifyingOnly(true);
        setVerificationNotice(null);

        const { data, error } = await verifyUserEmail(email);
        setIsVerifyingOnly(false);

        if (error || !data?.exists) {
            const message = error?.message || data?.message || 'This email address does not exist in our records.';
            setVerificationNotice({
                type: 'error',
                title: 'Email Not Found',
                message
            });
            methods.setError('email', {
                type: 'manual',
                message
            });
            useToastStore.getState().showToast(message, 'error');
        } else if (data.status === 'Suspended' || data.status === 'Inactive') {
            const message = data.message || `Your account is ${data.status.toLowerCase()}. Please contact your administrator.`;
            setVerificationNotice({
                type: 'error',
                title: `Account ${data.status}`,
                message
            });
            methods.setError('email', {
                type: 'manual',
                message
            });
            useToastStore.getState().showToast(message, 'error');
        } else {
            setVerificationNotice({
                type: 'success',
                title: 'Email Verified',
                message: `Account found for "${email}". You can now proceed to send the reset link.`
            });
            useToastStore.getState().showToast('Email verified: Account exists.', 'success');
        }
    }

    function handleFormError(errors: FieldErrors<ForgotPasswordFormValues>) {
        formErrors(errors, methods);
    }

    function handleBackToLogin() {
        navigate('/login');
    }

    function handleResetForm() {
        setIsSent(false);
        setSentEmail('');
        setVerificationNotice(null);
        methods.reset({ email: '' });
    }

    return (
        <div className="flex h-full items-center justify-center p-4 sm:p-6 w-full">
            <CommonCard
                cardHeaderProps={{ title: 'AU-JAS LMS' }}
                className="max-w-md w-full"
                variant="outlined"
            >
                {isSent
                    ? (
                        <div className="flex flex-col gap-6 p-6">
                            <div className="flex items-center gap-3">
                                <div className="bg-(--mui-palette-success-light)/50 dark:bg-green-950/40 flex items-center justify-center p-2.5 rounded-full text-(--mui-palette-success-main)">
                                    <CheckCircleIcon size={28} weight="fill" />
                                </div>
                                <div>
                                    <h6 className="font-semibold m-0 text-xl text-(--mui-palette-text-primary)">
                                        Check your email
                                    </h6>
                                    <span className="font-medium text-(--mui-palette-success-main) text-xs">
                                        Email Verified &amp; Reset Link Sent
                                    </span>
                                </div>
                            </div>

                            <div className="bg-(--mui-palette-action-hover) border border-(--mui-palette-divider) flex flex-col gap-2 p-4 rounded-lg">
                                <p className="leading-relaxed m-0 text-(--mui-palette-text-secondary) text-sm">
                                    We verified that an account exists for <strong className="text-(--mui-palette-text-primary)">{sentEmail}</strong> and have sent a password reset link to this address.
                                </p>
                                <p className="m-0 text-(--mui-palette-text-secondary) text-xs">
                                    The link expires after a short while. If you don't receive the email within a few minutes, please check your spam or junk folder.
                                </p>
                            </div>

                            <div className="flex flex-col gap-3">
                                <CommonButton
                                    fullWidth
                                    size="large"
                                    variant="contained"
                                    onClick={handleBackToLogin}
                                >
                                    Back to Sign In
                                </CommonButton>

                                <button
                                    className="cursor-pointer text-(--mui-palette-primary-main) text-sm hover:underline"
                                    type="button"
                                    onClick={handleResetForm}
                                >
                                    Try another email
                                </button>
                            </div>
                        </div>
                    )
                    : (
                        <form
                            className="flex flex-col gap-6 p-6"
                            onSubmit={handleSubmit(onSubmit, handleFormError)}
                        >
                            <div className="flex flex-col gap-1">
                                <h6 className="font-medium m-0 text-xl">
                                    Reset your password
                                </h6>
                                <p className="m-0 text-(--mui-palette-text-secondary) text-sm">
                                    Enter your registered email address to verify your account and receive password reset instructions.
                                </p>
                            </div>

                            {verificationNotice && (
                                <div
                                    className={
                                        verificationNotice.type === 'error'
                                            ? 'bg-(--mui-palette-error-light)/30 border border-(--mui-palette-error-main) dark:bg-red-950/20 flex gap-3 items-start p-3.5 rounded-lg text-sm'
                                            : 'bg-(--mui-palette-success-light)/30 border border-(--mui-palette-success-main) dark:bg-green-950/20 flex gap-3 items-start p-3.5 rounded-lg text-sm'
                                    }
                                >
                                    {verificationNotice.type === 'error' ? (
                                        <WarningCircleIcon
                                            size={20}
                                            className="text-(--mui-palette-error-main) shrink-0 mt-0.5"
                                        />
                                    ) : (
                                        <CheckCircleIcon
                                            size={20}
                                            className="text-(--mui-palette-success-main) shrink-0 mt-0.5"
                                        />
                                    )}
                                    <div className="flex flex-col gap-0.5">
                                        <span
                                            className={
                                                verificationNotice.type === 'error'
                                                    ? 'font-semibold text-(--mui-palette-error-main)'
                                                    : 'font-semibold text-(--mui-palette-success-main)'
                                            }
                                        >
                                            {verificationNotice.title}
                                        </span>
                                        <span className="text-(--mui-palette-text-secondary) text-xs">
                                            {verificationNotice.message}
                                        </span>
                                    </div>
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
                                rules={{
                                    required: 'Email is required',
                                    pattern: EMAIL_PATTERN
                                }}
                                size="small"
                                type="email"
                                variant="outlined"
                                onChange={() => {
                                    if (verificationNotice) {
                                        setVerificationNotice(null);
                                    }
                                }}
                            />

                            <div className="flex flex-col gap-3">
                                <CommonButton
                                    disabled={isSubmitting || isVerifyingOnly}
                                    loading={isSubmitting}
                                    fullWidth
                                    size="large"
                                    type="submit"
                                    variant="contained"
                                >
                                    {isSubmitting
                                        ? 'Verifying & Sending…'
                                        : 'Send Reset Link'
                                    }
                                </CommonButton>

                                <div className="flex items-center justify-between text-sm">
                                    <button
                                        className="cursor-pointer text-(--mui-palette-primary-main) text-xs sm:text-sm hover:underline"
                                        type="button"
                                        onClick={handleBackToLogin}
                                    >
                                        Back to Sign In
                                    </button>

                                    <button
                                        className="cursor-pointer text-(--mui-palette-text-secondary) text-xs sm:text-sm hover:text-(--mui-palette-primary-main) disabled:opacity-50"
                                        disabled={isSubmitting || isVerifyingOnly}
                                        type="button"
                                        onClick={handleVerifyOnly}
                                    >
                                        {isVerifyingOnly ? 'Checking email…' : 'Verify Email Only'}
                                    </button>
                                </div>
                            </div>
                        </form>
                    )
                }
            </CommonCard>
        </div>
    );
}