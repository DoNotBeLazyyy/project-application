import PageLoadingFallback from '@components/loading/PageLoadingFallback';
import React, {
    Component, ComponentType, lazy, ReactElement, ReactNode, Suspense
} from 'react';

export function isChunkLoadError(error: unknown): boolean {
    if (!error) return false;
    const err = error as { name?: string; message?: string };
    const name = err.name || '';
    const message = err.message || '';
    return (
        name === 'ChunkLoadError'
        || message.includes('dynamically imported module')
        || message.includes('Failed to fetch dynamically imported module')
        || message.includes('Importing a module script failed')
        || message.includes('error loading dynamically imported module')
        || message.includes('MIME type')
        || message.includes('Loading chunk')
    );
}

// Helper to retry dynamic imports when a chunk fails to load after a new deployment
function lazyWithRetry<P extends object>(
    factory: () => Promise<{ default: ComponentType<P> }>
) {
    return lazy(async() => {
        const pageAlreadyReloadedKey = 'chunk_reload_retry_' + window.location.pathname;
        try {
            const component = await factory();
            sessionStorage.removeItem(pageAlreadyReloadedKey);
            return component;
        }
        catch (error: any) {
            if (isChunkLoadError(error)) {
                const hasReloaded = sessionStorage.getItem(pageAlreadyReloadedKey);
                if (!hasReloaded) {
                    sessionStorage.setItem(pageAlreadyReloadedKey, 'true');
                    window.location.reload();
                    return new Promise<{ default: ComponentType<P> }>(() => {});
                }
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
        if (isChunkLoadError(error)) {
            const pageAlreadyReloadedKey = 'chunk_reload_retry_' + window.location.pathname;
            if (!sessionStorage.getItem(pageAlreadyReloadedKey)) {
                sessionStorage.setItem(pageAlreadyReloadedKey, 'true');
                window.location.reload();
            }
        }
    }

    render() {
        if (this.state.hasError) {
            const isChunk = isChunkLoadError(this.state.error);

            if (isChunk) {
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
                                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs shadow transition-colors cursor-pointer"
                                type="button"
                                onClick={() => {
                                    sessionStorage.clear();
                                    window.location.reload();
                                }}
                            >
                                Reload Page
                            </button>
                        </div>
                    </div>
                );
            }

            return (
                <div className="flex flex-col items-center justify-center min-h-[50vh] p-6 text-center">
                    <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 max-w-md flex flex-col items-center gap-3">
                        <h3 className="text-base font-bold text-rose-900 dark:text-rose-200">
                            Failed to Load Page
                        </h3>
                        <p className="text-xs text-rose-700 dark:text-rose-300">
                            {this.state.error?.message || 'An unexpected error occurred while loading this page.'}
                        </p>
                        <button
                            className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-medium text-xs shadow transition-colors cursor-pointer"
                            type="button"
                            onClick={() => {
                                this.setState({ hasError: false, error: null });
                            }}
                        >
                            Try Again
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
    factory: () => Promise<{ default: ComponentType<P> }>
): ReactElement {
    const LazyComponent = lazyWithRetry(factory) as ComponentType<any>;

    return (
        <LazyErrorBoundary>
            <Suspense fallback={<PageLoadingFallback />}>
                <LazyComponent />
            </Suspense>
        </LazyErrorBoundary>
    );
}