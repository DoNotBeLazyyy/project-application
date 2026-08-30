import { RefObject, useEffect } from 'react';

interface UseInfiniteScrollSentinelParams {
    /** The element that scrolls — the grid's `overflow-y` container. */
    root: RefObject<HTMLElement | null>;
    /** A sentinel element rendered near the bottom of the list. */
    target: RefObject<HTMLElement | null>;
    /** Whether there is another page left to fetch. */
    hasMore: boolean;
    /** True while a fetch is already in flight. */
    isLoading: boolean;
    /** Called when the sentinel scrolls into (or near) view. */
    onLoadMore: () => void;
}

/**
 * Fires `onLoadMore` when the `target` sentinel approaches the bottom of the
 * `root` scroll container. `rootMargin` starts the fetch ~240px early so the
 * next batch is usually in place before the user reaches it.
 */
export function useInfiniteScrollSentinel({
    root,
    target,
    hasMore,
    isLoading,
    onLoadMore
}: UseInfiniteScrollSentinelParams) {
    useEffect(function() {
        const rootEl = root.current;
        const targetEl = target.current;

        if (!rootEl || !targetEl || !hasMore) {
            return;
        }

        const observer = new IntersectionObserver(
            function(entries) {
                if (entries[0]?.isIntersecting && !isLoading) {
                    onLoadMore();
                }
            },
            { root: rootEl, rootMargin: '240px 0px' }
        );

        observer.observe(targetEl);

        return function() {
            observer.disconnect();
        };
    }, [root, target, hasMore, isLoading, onLoadMore]);
}