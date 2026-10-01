import PageLoadingFallback from '@components/loading/PageLoadingFallback';
import React, { Component, ComponentType, lazy, ReactElement, ReactNode, Suspense } from 'react';

// Helper to retry dynamic imports when a chunk fails to load after a new deployment
function lazyWithRetry<P extends object>(
    factory: () => Promise<{ default: ComponentType<P> }>
) {
    return lazy(async () => {
        const pageAlreadyReloadedKey = 'chunk_reload_retry_' + window.location.pathname;
        try {
            const component = await factory();
            sessionStorage.removeItem(pageAlreadyReloadedKey);
            return component;
        } catch (error: any) {
            const hasReloaded = sessionStorage.getItem(pageAlreadyReloadedKey);
            if (!hasReloaded) {
                sessionStorage.setItem(pageAlreadyReloadedKey, 'true');
                window.location.reload();
                return new Promise<{ default: ComponentType<P> }>(() => {});
            }
            throw error;
        }
    });
}

interface ErrorBoundaryProps {
    children: ReactNode;
}

interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
}

class LazyErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error) {
        const isChunkError =
            error.message?.includes('dynamically imported module') ||
            error.message?.includes('Failed to fetch dynamically imported module') ||
            error.message?.includes('Importing a module script failed') ||
            error.message?.includes('MIME type');

        if (isChunkError) {
            const pageAlreadyReloadedKey = 'chunk_reload_retry_' + window.location.pathname;
            if (!sessionStorage.getItem(pageAlreadyReloadedKey)) {
                sessionStorage.setItem(pageAlreadyReloadedKey, 'true');
                window.location.reload();
            }
        }
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="flex flex-col items-center justify-center min-h-[50vh] p-6 text-center">
                    <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 max-w-md flex flex-col items-center gap-3">
                        <h3 className="text-base font-bold text-blue-900 dark:text-blue-200">
                            New App Version Available
                        </h3>
                        <p className="text-xs text-blue-700 dark:text-blue-300">
                            A new deployment was published. Please reload the page to load the latest components.
                        </p>
                        <button
                            type="button"
                            onClick={() => {
                                sessionStorage.clear();
                                window.location.reload();
                            }}
                            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs shadow transition-colors cursor-pointer"
                        >
                            Reload Page
                        </button>
                    </div>
                </div>
            );
        }
        return this.props.children;
    }
}

/**
 * Helper to dynamically import and render a page component wrapped in Suspense & retry ErrorBoundary.
 *
 * @param factory - The dynamic import factory function.
 * @returns A ReactElement wrapped in ErrorBoundary and Suspense with PageLoadingFallback.
 */
export function lazyElement<P extends object>(
    factory: () => Promise<{ default: ComponentType<P> }>,
    props?: P
): ReactElement {
    const LazyComponent = lazyWithRetry(factory);

    return (
        <LazyErrorBoundary>
            <Suspense fallback={<PageLoadingFallback />}>
                <LazyComponent {...(props as P)} />
            </Suspense>
        </LazyErrorBoundary>
    );
}