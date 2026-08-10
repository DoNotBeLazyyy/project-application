import CommonButton from '@components/button/CommonButton';
import { resolveRoleHome } from '@constants/role.constant';
import { ArrowClockwiseIcon, HouseIcon, WarningOctagonIcon } from '@phosphor-icons/react';
import { useAppStore } from '@stores/app.store';
import { useLoadingStore } from '@stores/loading.store';
import { useEffect } from 'react';
import { isRouteErrorResponse, useNavigate, useRouteError } from 'react-router-dom';

interface ErrorPageProps {
    // Force the not found presentation regardless of the thrown error
    isNotFound?: boolean;
}

interface ErrorPresentation {
    code: string;
    detail: string;
    heading: string;
    message: string;
}

function resolvePresentation(error: unknown, isNotFound: boolean): ErrorPresentation {
    if (isNotFound || (isRouteErrorResponse(error) && error.status === 404)) {
        return {
            code: '404',
            detail: '',
            heading: 'Page not found',
            message: 'The page you are looking for does not exist or may have been moved.'
        };
    }

    if (isRouteErrorResponse(error)) {
        return {
            code: String(error.status),
            detail: typeof error.statusText === 'string'
                ? error.statusText
                : '',
            heading: 'Something went wrong',
            message: 'We could not load this page. You can head back to your dashboard and try again.'
        };
    }

    return {
        code: '',
        detail: error instanceof Error
            ? error.message
            : '',
        heading: 'Something went wrong',
        message: 'An unexpected problem stopped this page from loading. Your work up to this point has not been lost.'
    };
}

export default function ErrorPage({ isNotFound = false }: ErrorPageProps) {
    const error = useRouteError();
    const navigate = useNavigate();
    const activeRole = useAppStore((s) => s.activeRole);
    const setIsLoading = useLoadingStore((s) => s.setIsLoading);
    const presentation = resolvePresentation(error, isNotFound);
    const homePath = resolveRoleHome(activeRole);

    useEffect(function() {
        setIsLoading(false);
    }, [setIsLoading]);

    function handleGoHome() {
        navigate(homePath);
    }

    function handleReload() {
        window.location.reload();
    }

    return (
        <div className="flex flex-col gap-4 h-full items-center justify-center p-6 text-center w-full">
            <WarningOctagonIcon
                className="text-(--mui-palette-error-main)"
                size={56}
                weight="duotone"
            />
            {presentation.code && (
                <h3 className="font-bold text-(--mui-palette-text-primary) text-5xl">
                    {presentation.code}
                </h3>
            )}
            <h5 className="font-semibold text-(--mui-palette-text-primary) text-xl">
                {presentation.heading}
            </h5>
            <p className="max-w-md text-(--mui-palette-text-secondary)">
                {presentation.message}
            </p>
            {presentation.detail && (
                <details className="max-w-md text-left">
                    <summary className="cursor-pointer text-(--mui-palette-text-secondary) text-sm">
                        Technical details
                    </summary>
                    <p className="break-words mt-2 text-(--mui-palette-text-secondary) text-xs">
                        {presentation.detail}
                    </p>
                </details>
            )}
            <div className="flex flex-wrap gap-2 justify-center">
                <CommonButton
                    startIcon={<ArrowClockwiseIcon size={16} weight="bold" />}
                    variant="outlined"
                    onClick={handleReload}
                >
                    Reload Page
                </CommonButton>
                <CommonButton
                    startIcon={<HouseIcon size={16} weight="bold" />}
                    variant="contained"
                    onClick={handleGoHome}
                >
                    {activeRole
                        ? 'Back to Dashboard'
                        : 'Back to Sign In'}
                </CommonButton>
            </div>
        </div>
    );
}