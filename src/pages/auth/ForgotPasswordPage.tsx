import CommonButton from '@components/button/CommonButton';
import CommonCard from '@components/card/CommonCard';
import ValidCommonInput from '@components/input/ValidCommonInput';
import { requestPasswordReset } from '@services/auth.service';
import { ForgotPasswordFormValues } from '@type/auth.type';
import { formErrors } from '@utils/form.util';
import { useState } from 'react';
import { FieldErrors, useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';

export default function ForgotPasswordPage() {
    const navigate = useNavigate();
    const [isSent, setIsSent] = useState(false);
    const methods = useForm<ForgotPasswordFormValues>({
        defaultValues: { email: '' }
    });
    const { handleSubmit, formState: { isSubmitting } } = methods;

    async function onSubmit(values: ForgotPasswordFormValues) {
        await requestPasswordReset(values.email);
        setIsSent(true);
    }

    function handleFormError(errors: FieldErrors<ForgotPasswordFormValues>) {
        formErrors(errors, methods);
    }

    function handleBackToLogin() {
        navigate('/login');
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
                            <h6 className="font-medium m-0 text-xl">
                                Check your email
                            </h6>
                            <p className="m-0 text-(--mui-palette-text-secondary) text-sm">
                                If an account exists for that address, we have sent a link to set a new
                                password. The link expires after a short while, so use it soon.
                            </p>
                            <CommonButton
                                fullWidth
                                size="large"
                                variant="contained"
                                onClick={handleBackToLogin}
                            >
                                Back to Sign In
                            </CommonButton>
                        </div>
                    )
                    : (
                        <form
                            className="flex flex-col gap-6 p-6"
                            onSubmit={handleSubmit(onSubmit, handleFormError)}
                        >
                            <h6 className="font-medium m-0 text-xl">
                                Reset your password
                            </h6>
                            <p className="m-0 text-(--mui-palette-text-secondary) text-sm">
                                Enter the email address on your account and we will send you a link to set
                                a new password.
                            </p>

                            <ValidCommonInput
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

                            <CommonButton
                                disabled={isSubmitting}
                                loading={isSubmitting}
                                fullWidth
                                size="large"
                                type="submit"
                                variant="contained"
                            >
                                {isSubmitting
                                    ? 'Sending…'
                                    : 'Send Reset Link'
                                }
                            </CommonButton>

                            <button
                                className="cursor-pointer text-(--mui-palette-primary-main) text-sm"
                                type="button"
                                onClick={handleBackToLogin}
                            >
                                Back to Sign In
                            </button>
                        </form>
                    )
                }
            </CommonCard>
        </div>
    );
}