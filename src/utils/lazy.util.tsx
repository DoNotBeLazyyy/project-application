import PageLoadingFallback from '@components/loading/PageLoadingFallback';
import { ComponentType, lazy, ReactElement, Suspense } from 'react';

/**
 * Helper to dynamically import and render a page component wrapped in a Suspense boundary.
 *
 * @param factory - The dynamic import factory function.
 * @returns A ReactElement wrapped in Suspense with PageLoadingFallback.
 */
export function lazyElement<P extends object>(
    factory: () => Promise<{ default: ComponentType<P> }>,
    props?: P
): ReactElement {
    const LazyComponent = lazy(factory);

    return (
        <Suspense fallback={<PageLoadingFallback />}>
            <LazyComponent {...(props as P)} />
        </Suspense>
    );
}